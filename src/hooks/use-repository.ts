import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { PillyRepository } from '@/storage/repository';

export function useRepository(): PillyRepository {
  const database = useSQLiteContext();
  return useMemo(() => new PillyRepository(database), [database]);
}
