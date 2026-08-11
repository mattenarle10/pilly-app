import { useQuery } from '@tanstack/react-query';

import { useRepository } from './use-repository';

export const medicinesQueryKey = ['medications', 'all'] as const;
export const activeMedicinesQueryKey = ['medications', 'active'] as const;

export function useMedicines() {
  const repository = useRepository();

  return useQuery({
    queryKey: medicinesQueryKey,
    queryFn: () => repository.listMedications({ includeArchived: true }),
    networkMode: 'always',
  });
}
