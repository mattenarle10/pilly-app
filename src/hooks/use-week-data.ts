import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { toLocalDate, weekStartingToday } from '@/models/schedule';
import { activeMedicinesQueryKey } from '@/hooks/use-medicines';
import { useRepository } from '@/hooks/use-repository';

export function useWeekData() {
  const repository = useRepository();
  const today = useMemo(() => new Date(), []);
  const dates = useMemo(() => weekStartingToday(today), [today]);
  const start = toLocalDate(dates[0]!);
  const doses = useQuery({
    queryKey: ['organizer-week', start],
    queryFn: () => Promise.all(dates.map((date) => repository.listScheduledDoses(date))),
    networkMode: 'always',
  });
  const medicines = useQuery({
    queryKey: activeMedicinesQueryKey,
    queryFn: () => repository.listMedications(),
    networkMode: 'always',
  });

  return { dates, doses, medicines };
}
