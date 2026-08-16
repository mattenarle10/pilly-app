import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import type { DoseStatus, ScheduledDose } from '@/models/dose';
import { nextDoseWidgetQueryKey } from '@/models/next-dose-widget';
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
    onSuccess: (_, variables) => {
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
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['scheduled-doses'] }),
        queryClient.invalidateQueries({ queryKey: nextDoseWidgetQueryKey }),
      ]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['organizer-week'] }),
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
