import type { PropsWithChildren } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Medication } from '@/models/medication';
import type { ExportSchedule } from '@/models/export';
import type { PillyRepository } from '@/storage/repository';
import { useExportData } from '@/hooks/use-export-data';
import { useRepository } from '@/hooks/use-repository';

jest.mock('@/hooks/use-repository');

const mockedUseRepository = jest.mocked(useRepository);

const medicine: Medication = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Archived medicine',
  instructions: '',
  supplyCount: null,
  appearanceShape: 'capsule',
  appearanceSize: 'medium',
  appearanceColor: '#F3CCD7',
  appearanceSecondaryColor: '#FBE9DE',
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
  archivedAt: '2026-08-13T00:00:00.000Z',
  timeZoneIdentifier: 'Asia/Manila',
};
const schedule: ExportSchedule = {
  id: '22222222-2222-4222-8222-222222222222',
  medicationId: medicine.id,
  hour: 9,
  minute: 0,
  weekdayMask: 127,
  sortOrder: 0,
  reminderEnabled: false,
  startsOn: '2026-08-10',
  endsOn: '2026-08-11',
  createdAt: '2026-08-10T00:00:00.000Z',
};

describe('useExportData', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('assembles archived medicines, historical schedules, records, and audit events', async () => {
    const repository = {
      listMedications: jest.fn().mockResolvedValue([medicine]),
      listExportSchedules: jest.fn().mockResolvedValue([schedule]),
      listExportDoseRecords: jest.fn().mockResolvedValue([{ occurrenceId: 'dose' }]),
      listExportDoseEvents: jest.fn().mockResolvedValue([{ id: 'event' }]),
      listExportSupplyEvents: jest.fn().mockResolvedValue([{ id: 'supply' }]),
      getSetting: jest.fn((key: string) =>
        Promise.resolve(key === 'profileFirstName' ? ' Ada ' : null),
      ),
    };
    mockedUseRepository.mockReturnValue(repository as unknown as PillyRepository);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => useExportData(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repository.listMedications).toHaveBeenCalledWith({ includeArchived: true });
    expect(result.current.data).toMatchObject({
      format: 'pilly-export',
      version: 1,
      profile: { displayName: 'Ada' },
      medicines: [{ medicine, schedules: [schedule] }],
      doseRecords: [{ occurrenceId: 'dose' }],
      doseEvents: [{ id: 'event' }],
      supplyEvents: [{ id: 'supply' }],
    });

    queryClient.clear();
  });
});
