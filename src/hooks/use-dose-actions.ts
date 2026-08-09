import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import type { ScheduledDose } from '@/data/repositories';
import { useRepository } from './use-repository';

export type DoseActionStatus = 'taken' | 'skipped' | 'notRecorded';

const toastDurationMs = 6000;
const screenReaderToastDurationMs = 12000;

export function useDoseActions() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const [recentDose, setRecentDose] = useState<ScheduledDose | null>(null);

  useEffect(() => {
    if (!recentDose) return;
    let canceled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    void AccessibilityInfo.isScreenReaderEnabled().then((screenReaderEnabled) => {
      if (canceled) return;
      timeout = setTimeout(
        () => setRecentDose(null),
        screenReaderEnabled ? screenReaderToastDurationMs : toastDurationMs,
      );
    });
    return () => {
      canceled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [recentDose]);

  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ dose, status }: { dose: ScheduledDose; status: DoseActionStatus }) =>
      status === 'notRecorded' ? repository.undoDose(dose) : repository.recordDose(dose, status),
    onSuccess: (_, variables) => {
      const feedback =
        variables.status === 'taken'
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          : Haptics.selectionAsync();
      void feedback.catch(() => undefined);
      setRecentDose(variables.status === 'notRecorded' ? null : variables.dose);
      return queryClient.invalidateQueries({ queryKey: ['scheduled-doses'] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['organizer-week'] }),
  });

  return {
    mutation,
    recentDose,
    recordDose: (dose: ScheduledDose, status: DoseActionStatus) =>
      mutation.mutate({ dose, status }),
    undoRecent: () => {
      if (recentDose) mutation.mutate({ dose: recentDose, status: 'notRecorded' });
    },
  };
}
