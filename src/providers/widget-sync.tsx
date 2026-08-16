import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useRepository } from '@/hooks/use-repository';
import { buildNextDoseWidgetTimeline, nextDoseWidgetQueryKey } from '@/models/next-dose-widget';
import { weekStartingToday } from '@/models/schedule';
import NextDoseWidget from '@/ui/widgets/next-dose-widget';

export function WidgetSync() {
  const repository = useRepository();
  const timeline = useQuery({
    queryKey: nextDoseWidgetQueryKey,
    queryFn: async () => {
      const dates = weekStartingToday(new Date());
      const [medicines, dosesByDay] = await Promise.all([
        repository.listMedications(),
        Promise.all(dates.map((date) => repository.listScheduledDoses(date))),
      ]);
      return buildNextDoseWidgetTimeline({
        medicationCount: medicines.length,
        doses: dosesByDay.flat(),
        now: new Date(),
      });
    },
    enabled: Platform.OS === 'ios',
    networkMode: 'always',
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (!timeline.data) return;
    try {
      NextDoseWidget.updateTimeline(timeline.data);
    } catch (error) {
      if (__DEV__) {
        console.warn('Unable to refresh the Next dose widget.', error);
      }
    }
  }, [timeline.data]);

  return null;
}
