import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { weekStartingToday } from '@/models/schedule';
import { queryKeys } from './query-keys';
import { useRepository } from './use-repository';
import { useWeekDoses } from './use-week-doses';

export function useWeekData() {
  const repository = useRepository();
  const today = useMemo(() => new Date(), []);
  const dates = useMemo(() => weekStartingToday(today), [today]);
  const doses = useWeekDoses(dates);
  const medicines = useQuery({
    queryKey: queryKeys.medications.active,
    queryFn: () => repository.listMedications(),
    networkMode: 'always',
  });

  return { dates, doses, medicines };
}
