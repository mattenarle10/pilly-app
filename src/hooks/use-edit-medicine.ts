import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assertMedicationDraft,
  scheduleConfigurationFromDraft,
  supplyValue,
  type MedicationDraft,
} from '@/models/medicine-form';
import { reconcileLocalReminders } from '@/services/notifications';
import { queryKeys } from './query-keys';
import { useRepository } from './use-repository';

export function useEditMedicine(medicationId: string) {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.medication(medicationId),
    queryFn: () => repository.getMedication(medicationId),
    networkMode: 'always',
  });
  const saveMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (draft: MedicationDraft) => {
      assertMedicationDraft(draft);
      await repository.updateMedication(medicationId, {
        name: draft.name.trim(),
        instructions: draft.instructions.trim(),
        supplyCount: supplyValue(draft.supply),
        appearanceShape: draft.appearanceShape,
        appearanceSize: draft.appearanceSize,
        appearanceColor: draft.appearanceColor,
        appearanceSecondaryColor: draft.appearanceSecondaryColor,
        schedules: scheduleConfigurationFromDraft(draft),
      });

      await reconcileLocalReminders(repository);
    },
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: queryKeys.medication(medicationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.medications.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.scheduledDoses.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organizerWeek.root }),
        queryClient.invalidateQueries({ queryKey: queryKeys.setting('reminderNotice') }),
      ]);
    },
  });

  return { query, saveMutation };
}
