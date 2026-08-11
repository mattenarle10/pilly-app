import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assertMedicationDraft,
  scheduleConfigurationFromDraft,
  supplyValue,
  type MedicationDraft,
} from '@/features/medicine-form/medication-form';
import { scheduleLocalReminders } from '@/services/notifications';
import { useRepository } from './use-repository';

export function useEditMedicine(medicationId: string) {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['medication', medicationId],
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
        appearanceTone: draft.appearanceTone,
        appearanceSecondaryTone: draft.appearanceSecondaryTone,
        schedules: scheduleConfigurationFromDraft(draft),
      });

      let reminderNotice: 'none' | 'denied' | 'failed' = 'failed';
      try {
        const status = await scheduleLocalReminders(await repository.listReminderSchedules());
        reminderNotice = status === 'denied' ? 'denied' : 'none';
      } catch {}
      try {
        await repository.setSetting('reminderNotice', reminderNotice);
      } catch {}
    },
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['medication', medicationId] }),
        queryClient.invalidateQueries({ queryKey: ['medications'] }),
        queryClient.invalidateQueries({ queryKey: ['scheduled-doses'] }),
        queryClient.invalidateQueries({ queryKey: ['week'] }),
        queryClient.invalidateQueries({ queryKey: ['organizer-week'] }),
        queryClient.invalidateQueries({ queryKey: ['settings', 'reminderNotice'] }),
      ]);
    },
  });

  return { query, saveMutation };
}
