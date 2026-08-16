import { useQuery } from '@tanstack/react-query';

import { buildPillyExport } from '@/models/export';
import { profileSettingKeys, profileDisplayName, resolveProfileName } from '@/models/profile';

import { queryKeys } from './query-keys';
import { useRepository } from './use-repository';

export function useExportData() {
  const repository = useRepository();

  return useQuery({
    queryKey: queryKeys.exportData,
    queryFn: async () => {
      const [
        medications,
        schedules,
        doseRecords,
        doseEvents,
        supplyEvents,
        firstName,
        lastName,
        legacyDisplayName,
      ] = await Promise.all([
        repository.listMedications({ includeArchived: true }),
        repository.listExportSchedules(),
        repository.listExportDoseRecords(),
        repository.listExportDoseEvents(),
        repository.listExportSupplyEvents(),
        repository.getSetting(profileSettingKeys.firstName),
        repository.getSetting(profileSettingKeys.lastName),
        repository.getSetting(profileSettingKeys.displayName),
      ]);
      const medicineEntries = medications.map((medicine) => ({
        medicine,
        schedules: schedules.filter((schedule) => schedule.medicationId === medicine.id),
      }));
      const profile = resolveProfileName({ firstName, lastName, legacyDisplayName });
      return buildPillyExport({
        exportedAt: new Date(),
        displayName: profileDisplayName(profile),
        medicines: medicineEntries,
        doseRecords,
        doseEvents,
        supplyEvents,
      });
    },
    networkMode: 'always',
  });
}
