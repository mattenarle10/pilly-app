import { useQuery } from '@tanstack/react-query';

import { queryKeys } from './query-keys';
import { useRepository } from './use-repository';

export function useDoseHistory(medicationId: string) {
  const repository = useRepository();

  return useQuery({
    queryKey: queryKeys.doseHistory(medicationId),
    queryFn: async () => {
      const [detail, events] = await Promise.all([
        repository.getMedication(medicationId),
        repository.listDoseHistory(medicationId),
      ]);
      return { medication: detail?.medication ?? null, events };
    },
    enabled: Boolean(medicationId),
    networkMode: 'always',
  });
}
