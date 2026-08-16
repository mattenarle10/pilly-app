import { useQuery } from '@tanstack/react-query';

import { toLocalDate } from '@/models/schedule';
import { queryKeys } from './query-keys';
import { useRepository } from './use-repository';

export function useWeekDoses(dates: readonly Date[], enabled = true) {
  const repository = useRepository();
  const localDates = dates.map(toLocalDate);

  return useQuery({
    queryKey: queryKeys.organizerWeek.range(localDates),
    queryFn: () => repository.listScheduledDosesForDates(dates),
    enabled: enabled && dates.length > 0,
    networkMode: 'always',
  });
}
