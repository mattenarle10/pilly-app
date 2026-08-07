import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { PillyRepository } from '@/data/repositories';

const RepositoryContext = createContext<PillyRepository | null>(null);
export function RepositoryProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const repository = useMemo(() => new PillyRepository(database), [database]);
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}
export function useRepository(): PillyRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('Pilly repository is unavailable.');
  return repository;
}
