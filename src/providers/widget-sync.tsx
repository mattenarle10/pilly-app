import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
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
  const [currentDay, setCurrentDay] = useState(() => localDayStart(appNow()));
  const dates = useMemo(() => weekStartingToday(currentDay), [currentDay]);
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
    if (!enabled) return;

    const refreshCurrentDay = () => {
      const nextDay = localDayStart(appNow());
      setCurrentDay((day) => (day.getTime() === nextDay.getTime() ? day : nextDay));
    };
    const now = appNow();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const midnightTimer = setTimeout(
      refreshCurrentDay,
      nextMidnight.getTime() - now.getTime() + 250,
    );
    const appStateSubscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refreshCurrentDay();
    });

    return () => {
      clearTimeout(midnightTimer);
      appStateSubscription.remove();
    };
  }, [currentDay, enabled]);

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

function localDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
