import { useQuery } from '@tanstack/react-query';

import { queryKeys } from './query-keys';
import { useRepository } from './use-repository';

export function useMedicines() {
  const repository = useRepository();

  return useQuery({
    queryKey: queryKeys.medications.all,
    queryFn: () => repository.listMedications({ includeArchived: true }),
    networkMode: 'always',
  });
}
