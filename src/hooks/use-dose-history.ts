import { useQuery } from '@tanstack/react-query';

import { useRepository } from './use-repository';

export function useDoseHistory(medicationId: string) {
  const repository = useRepository();

  return useQuery({
    queryKey: ['dose-history', medicationId],
    queryFn: () => repository.listDoseHistory(medicationId),
    enabled: Boolean(medicationId),
    networkMode: 'always',
  });
}
