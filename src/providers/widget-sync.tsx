import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useRepository } from '@/hooks/use-repository';
import { queryKeys } from '@/hooks/query-keys';
import { useWeekDoses } from '@/hooks/use-week-doses';
import { buildNextDoseWidgetTimeline } from '@/models/next-dose-widget';
import { weekStartingToday } from '@/models/schedule';
import { appNow } from '@/services/app-clock';
import NextDoseWidget from '@/ui/widgets/next-dose-widget';

export function WidgetSync() {
  const repository = useRepository();
  const enabled = Platform.OS === 'ios';
  const dates = useMemo(() => weekStartingToday(appNow()), []);
  const doses = useWeekDoses(dates, enabled);
  const medicines = useQuery({
    queryKey: queryKeys.medications.active,
    queryFn: () => repository.listMedications(),
    enabled,
    networkMode: 'always',
  });
  const timeline = useMemo(
    () =>
      doses.data && medicines.data
        ? buildNextDoseWidgetTimeline({
            medicationCount: medicines.data.length,
            doses: doses.data.flat(),
            now: appNow(),
          })
        : null,
    [doses.data, medicines.data],
  );

  useEffect(() => {
    if (!timeline) return;
    try {
      NextDoseWidget.updateTimeline(timeline);
    } catch (error) {
      if (__DEV__) {
        console.warn('Unable to refresh the Next dose widget.', error);
      }
    }
  }, [timeline]);

  return null;
}
