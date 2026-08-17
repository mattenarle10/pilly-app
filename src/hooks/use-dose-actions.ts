import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import type { DoseStatus, ScheduledDose } from '@/models/dose';
import { reconcileLocalReminders } from '@/services/notifications';
import { queryKeys } from './query-keys';
import { useRepository } from './use-repository';

export type RecentDoseAction = {
  dose: ScheduledDose;
  status: Exclude<DoseStatus, 'notRecorded'>;
};

const toastDurationMs = 4000;
const screenReaderToastDurationMs = 10000;

export function useDoseActions() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const [recentAction, setRecentAction] = useState<RecentDoseAction | null>(null);
  const canSyncReminders = () => {
    const maybeStore = repository as Partial<{
      listReminderSchedules: () => Promise<unknown>;
      setSetting: (key: string, value: string) => Promise<unknown>;
      listScheduledDosesForDates?: (dates: readonly Date[]) => Promise<unknown>;
    }>;
    return (
      typeof maybeStore.listReminderSchedules === 'function' &&
      typeof maybeStore.setSetting === 'function'
    );
  };

  useEffect(() => {
    if (!recentAction) return;
    let canceled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const dismissAfter = (duration: number) => {
      if (canceled) return;
      timeout = setTimeout(() => setRecentAction(null), duration);
    };
    void AccessibilityInfo.isScreenReaderEnabled()
      .then((screenReaderEnabled) =>
        dismissAfter(screenReaderEnabled ? screenReaderToastDurationMs : toastDurationMs),
      )
      .catch(() => dismissAfter(toastDurationMs));
    return () => {
      canceled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [recentAction]);

  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ dose, status }: { dose: ScheduledDose; status: DoseStatus }) =>
      status === 'notRecorded' ? repository.undoDose(dose) : repository.recordDose(dose, status),
    onSuccess: async (_, variables) => {
      const feedback =
        variables.status === 'taken'
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          : Haptics.selectionAsync();
      void feedback.catch(() => undefined);
      setRecentAction(
        variables.status === 'notRecorded'
          ? null
          : { dose: variables.dose, status: variables.status },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.scheduledDoses.root }),
      ]);
      if (canSyncReminders()) {
        await reconcileLocalReminders(repository);
        await queryClient.invalidateQueries({ queryKey: queryKeys.setting('reminderNotice') });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizerWeek.root }),
  });

  return {
    mutation,
    recentAction,
    recordDose: (dose: ScheduledDose, status: DoseStatus) => mutation.mutate({ dose, status }),
    undoRecent: () => {
      if (recentAction) mutation.mutate({ dose: recentAction.dose, status: 'notRecorded' });
    },
  };
}
