import type { PropsWithChildren } from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PillyRepository, ScheduledDose } from '@/data/repositories';
import { useDoseActions } from './use-dose-actions';
import { useRepository } from './use-repository';

jest.mock('./use-repository');
jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockedUseRepository = jest.mocked(useRepository);
const dose: ScheduledDose = {
  occurrenceId: 'schedule-1:2026-08-09',
  medication: {
    id: 'd7bf17a4-3b0c-4c61-9155-7102fe0769f2',
    name: 'Morning tablet',
    instructions: 'One tablet',
    supplyCount: 14,
    appearanceShape: 'capsule',
    appearanceSize: 'medium',
    appearanceTone: 'rose',
    appearanceSecondaryTone: 'rose',
    createdAt: '2026-08-09T00:00:00.000Z',
    updatedAt: '2026-08-09T00:00:00.000Z',
    archivedAt: null,
    timeZoneIdentifier: 'Asia/Manila',
  },
  schedule: {
    id: '4cf5bccb-1e47-4093-b91d-428cf5eed57b',
    medicationId: 'd7bf17a4-3b0c-4c61-9155-7102fe0769f2',
    hour: 9,
    minute: 0,
    weekdayMask: 127,
    sortOrder: 0,
    reminderEnabled: false,
  },
  scheduledAt: new Date('2026-08-09T01:00:00.000Z'),
  status: 'notRecorded',
  recordedAt: null,
};

async function setup(screenReaderEnabled = false) {
  const repository = {
    recordDose: jest.fn().mockResolvedValue(undefined),
    undoDose: jest.fn().mockResolvedValue(undefined),
  };
  mockedUseRepository.mockReturnValue(repository as unknown as PillyRepository);
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(screenReaderEnabled);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = await renderHook(() => useDoseActions(), { wrapper });
  return { repository, ...hook };
}

describe('useDoseActions confirmation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('shows the recorded status and dismisses it after four seconds', async () => {
    const { result } = await setup();

    await act(() => result.current.recordDose(dose, 'taken'));
    await waitFor(() => expect(result.current.recentAction?.status).toBe('taken'));

    await act(() => jest.advanceTimersByTimeAsync(3999));
    expect(result.current.recentAction).not.toBeNull();
    await act(() => jest.advanceTimersByTimeAsync(1));
    expect(result.current.recentAction).toBeNull();
  });

  test('keeps VoiceOver confirmation longer and Undo targets the same dose', async () => {
    const { repository, result } = await setup(true);

    await act(() => result.current.recordDose(dose, 'skipped'));
    await waitFor(() => expect(result.current.recentAction?.status).toBe('skipped'));

    await act(() => jest.advanceTimersByTimeAsync(4000));
    expect(result.current.recentAction).not.toBeNull();
    await act(() => result.current.undoRecent());
    await waitFor(() => expect(repository.undoDose).toHaveBeenCalledWith(dose));
    await waitFor(() => expect(result.current.recentAction).toBeNull());
  });
});
