import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { reconcileLocalReminders } from '@/services/notifications';
import { queryKeys } from './query-keys';
import { useRepository } from './use-repository';

export function useMedicineDetail(medicationId: string) {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const [supplyDraft, setSupplyDraft] = useState<number | null>();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const query = useQuery({
    queryKey: queryKeys.medication(medicationId),
    queryFn: () => repository.getMedication(medicationId),
    networkMode: 'always',
  });
  const supply =
    supplyDraft === undefined ? (query.data?.medication.supplyCount ?? null) : supplyDraft;

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.medication(medicationId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.root }),
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledDoses.root }),
      queryClient.invalidateQueries({ queryKey: queryKeys.organizerWeek.root }),
    ]);
  const syncReminders = async () => {
    await reconcileLocalReminders(repository);
    await queryClient.invalidateQueries({ queryKey: queryKeys.setting('reminderNotice') });
  };
  const supplyMutation = useMutation({
    mutationFn: (nextSupply: number | null) => repository.setSupplyCount(medicationId, nextSupply),
    onSuccess: async (_, savedSupply) => {
      await refresh();
      setSupplyDraft((current) => (current === savedSupply ? undefined : current));
    },
  });
  const supplyChanged =
    supplyDraft !== undefined && supply !== (query.data?.medication.supplyCount ?? null);
  const persistSupply = supplyMutation.mutate;

  useEffect(() => {
    if (
      !supplyChanged ||
      supplyDraft === undefined ||
      supplyMutation.isPending ||
      supplyMutation.isError
    ) {
      return;
    }
    const timeout = setTimeout(() => persistSupply(supplyDraft), 400);
    return () => clearTimeout(timeout);
  }, [persistSupply, supplyChanged, supplyDraft, supplyMutation.isError, supplyMutation.isPending]);

  const updateSupply = (nextSupply: number | null) => {
    supplyMutation.reset();
    setSupplyDraft(nextSupply);
  };
  const reminderMutation = useMutation({
    mutationFn: async ({ scheduleId, enabled }: { scheduleId: string; enabled: boolean }) => {
      await repository.setScheduleReminderEnabled(scheduleId, enabled);
      await queryClient.invalidateQueries({ queryKey: queryKeys.medication(medicationId) });
      await syncReminders();
    },
    onSuccess: refresh,
  });
  const archiveMutation = useMutation({
    mutationFn: async (archived: boolean) => {
      await repository.setMedicationArchived(medicationId, archived);
      await syncReminders();
    },
    onSuccess: async () => {
      setConfirmArchive(false);
      await refresh();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await repository.deleteMedication(medicationId);
      await syncReminders();
    },
    onSuccess: async () => {
      setConfirmDelete(false);
      await refresh();
      router.replace('/(tabs)/medicines');
    },
  });

  return {
    query,
    supply,
    setSupplyDraft: updateSupply,
    supplyChanged,
    retrySupply: () => {
      if (supplyDraft !== undefined && !supplyMutation.isPending) {
        supplyMutation.mutate(supplyDraft);
      }
    },
    supplyMutation,
    reminderMutation,
    archiveMutation,
    deleteMutation,
    confirmArchive,
    setConfirmArchive,
    confirmDelete,
    setConfirmDelete,
  };
}
