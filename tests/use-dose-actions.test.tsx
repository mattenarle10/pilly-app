import type { PropsWithChildren } from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ScheduledDose } from '@/models/dose';
import type { PillyRepository } from '@/storage/repository';
import { useDoseActions } from '@/hooks/use-dose-actions';
import { useRepository } from '@/hooks/use-repository';
import { buildScheduledDose } from './support/builders';

jest.mock('@/hooks/use-repository');
jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockedUseRepository = jest.mocked(useRepository);
const dose: ScheduledDose = buildScheduledDose({
  occurrenceId: 'schedule-1:2026-08-09',
  scheduledAt: new Date('2026-08-09T01:00:00.000Z'),
  medication: { name: 'Morning tablet', instructions: 'One tablet' },
});

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
