import type { PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PillyRepository } from '@/storage/repository';
import { defaults } from '@/models/medicine-form';
import { reconcileLocalReminders } from '@/services/notifications';
import { useEditMedicine } from '@/hooks/use-edit-medicine';
import { useRepository } from '@/hooks/use-repository';

jest.mock('@/hooks/use-repository');
jest.mock('@/services/notifications', () => ({
  reconcileLocalReminders: jest.fn(),
}));

const mockedUseRepository = jest.mocked(useRepository);
const mockedReconcileLocalReminders = jest.mocked(reconcileLocalReminders);

async function setup() {
  const repository = {
    getMedication: jest.fn().mockResolvedValue(null),
    updateMedication: jest.fn().mockResolvedValue({ medicationId: 'medicine-1', schedules: [] }),
    listReminderSchedules: jest.fn().mockResolvedValue([]),
    setSetting: jest.fn().mockResolvedValue(undefined),
  };
  mockedUseRepository.mockReturnValue(repository as unknown as PillyRepository);
  mockedReconcileLocalReminders.mockResolvedValue('none');
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = await renderHook(() => useEditMedicine('medicine-1'), { wrapper });
  return { repository, ...hook };
}

describe('useEditMedicine', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('saves medicine, supply, appearance, and schedule as one repository update', async () => {
    const { repository, result } = await setup();

    await act(() =>
      result.current.saveMutation.mutateAsync({
        ...defaults,
        name: ' Evening capsule ',
        instructions: ' With food ',
        supply: '12',
        selectedDays: [1, 3, 5],
        schedules: [
          { time: '20:15', reminderEnabled: true },
          { time: '08:00', reminderEnabled: false },
        ],
        appearanceColor: '#ECEAF7',
        appearanceSecondaryColor: '#FBE9DE',
      }),
    );

    expect(repository.updateMedication).toHaveBeenCalledWith('medicine-1', {
      name: 'Evening capsule',
      instructions: 'With food',
      supplyCount: 12,
      form: 'tablet',
      tabletShape: 'round',
      appearanceSize: 'medium',
      appearanceColor: '#ECEAF7',
      appearanceSecondaryColor: '#FBE9DE',
      schedules: [
        {
          hour: 8,
          minute: 0,
          weekdayMask: 21,
          sortOrder: 0,
          reminderEnabled: false,
        },
        {
          hour: 20,
          minute: 15,
          weekdayMask: 21,
          sortOrder: 1,
          reminderEnabled: true,
        },
      ],
    });
    await waitFor(() => expect(mockedReconcileLocalReminders).toHaveBeenCalledWith(repository));
  });

  test('keeps the save successful when reminder reconciliation fails', async () => {
    const { repository, result } = await setup();
    mockedReconcileLocalReminders.mockResolvedValueOnce('failed');

    await act(() =>
      result.current.saveMutation.mutateAsync({
        ...defaults,
        name: 'Morning tablet',
      }),
    );

    await waitFor(() => expect(result.current.saveMutation.isSuccess).toBe(true));
    expect(mockedReconcileLocalReminders).toHaveBeenCalledWith(repository);
  });
});
