import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { addDatabaseChangeListener, useSQLiteContext } from 'expo-sqlite';
import { useQueryClient } from '@tanstack/react-query';

import { useAccountSession } from '@/hooks/use-account-session';
import type { BootstrapResponse } from '@/models/sync';
import { fetchCloudBootstrap, isCloudSyncConfigured } from '@/services/cloud-sync-api';
import { synchronizeCloudState } from '@/services/cloud-sync';
import { reconcileLocalReminders } from '@/services/notifications';
import { PillyRepository } from '@/storage/repository';
import { PillySyncStore, type CloudSetupMode } from '@/storage/sync-store';

export type CloudSyncStatus =
  | { kind: 'local' }
  | { kind: 'checking' }
  | { kind: 'entitlement-required' }
  | { kind: 'pending-backup' }
  | { kind: 'pending-restore' }
  | { kind: 'pending-merge' }
  | { kind: 'active'; syncing: boolean; lastError: string | null }
  | { kind: 'blocked-account' }
  | { kind: 'error'; message: string };

export type CloudSyncContextValue = {
  configured: boolean;
  status: CloudSyncStatus;
  chooseSetup: (mode: CloudSetupMode) => Promise<void>;
  retry: () => Promise<void>;
};

export const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

export function CloudSyncProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const account = useAccountSession();
  const queryClient = useQueryClient();
  const store = useMemo(() => new PillySyncStore(database), [database]);
  const repository = useMemo(() => new PillyRepository(database), [database]);
  const configured = isCloudSyncConfigured();
  const [status, setStatus] = useState<CloudSyncStatus>({ kind: 'local' });
  const bootstrapRef = useRef<BootstrapResponse | null>(null);
  const syncPromiseRef = useRef<Promise<void> | null>(null);

  const refreshAfterRemoteChanges = useCallback(async () => {
    await queryClient.invalidateQueries();
    await reconcileLocalReminders(repository);
  }, [queryClient, repository]);

  const sync = useCallback(async () => {
    if (account.state.kind !== 'signed-in' || syncPromiseRef.current) return;
    const accountId = account.state.user.id;
    const state = store.getOrCreateState();
    if (state.accountId !== accountId || state.migrationState !== 'active') return;
    const task = (async () => {
      setStatus({ kind: 'active', syncing: true, lastError: state.lastError });
      try {
        const result = await synchronizeCloudState(store, accountId);
        if (result.changeCount > 0) await refreshAfterRemoteChanges();
        setStatus({ kind: 'active', syncing: false, lastError: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Cloud backup is unavailable.';
        store.recordError(accountId, message);
        setStatus({ kind: 'active', syncing: false, lastError: message });
      }
    })();
    syncPromiseRef.current = task;
    await task.finally(() => {
      syncPromiseRef.current = null;
    });
  }, [account.state, refreshAfterRemoteChanges, store]);

  const check = useCallback(async () => {
    if (account.state.kind !== 'signed-in') {
      bootstrapRef.current = null;
      store.disconnect();
      setStatus({ kind: 'local' });
      return;
    }
    if (!configured) {
      setStatus({ kind: 'error', message: 'Cloud backup is not configured in this build.' });
      return;
    }
    setStatus({ kind: 'checking' });
    try {
      const bootstrap = await fetchCloudBootstrap();
      bootstrapRef.current = bootstrap;
      if (!bootstrap.entitlement.isActive) {
        setStatus({ kind: 'entitlement-required' });
        return;
      }
      const migrationState = store.resolveSetupState(account.state.user.id, bootstrap.hasCloudData);
      if (migrationState === 'active') {
        if (!store.getOrCreateState().accountId) {
          store.configureAccount(account.state.user.id, 'empty', bootstrap);
        }
        setStatus({ kind: 'active', syncing: false, lastError: null });
        await sync();
      } else if (migrationState === 'pendingBackup') setStatus({ kind: 'pending-backup' });
      else if (migrationState === 'pendingRestore') setStatus({ kind: 'pending-restore' });
      else if (migrationState === 'pendingMerge') setStatus({ kind: 'pending-merge' });
      else if (migrationState === 'blockedAccount') setStatus({ kind: 'blocked-account' });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Cloud backup is unavailable.',
      });
    }
  }, [account.state, configured, store, sync]);

  const chooseSetup = useCallback(
    async (mode: CloudSetupMode) => {
      if (account.state.kind !== 'signed-in') return;
      const bootstrap = bootstrapRef.current ?? (await fetchCloudBootstrap());
      if (!bootstrap.entitlement.isActive) {
        setStatus({ kind: 'entitlement-required' });
        return;
      }
      store.configureAccount(account.state.user.id, mode, bootstrap);
      setStatus({ kind: 'active', syncing: false, lastError: null });
      await refreshAfterRemoteChanges();
      await sync();
    },
    [account.state, refreshAfterRemoteChanges, store, sync],
  );

  useEffect(() => {
    const timer = setTimeout(() => void check(), 0);
    return () => clearTimeout(timer);
  }, [check]);

  useEffect(() => {
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void sync();
    });
    const databaseChanges = addDatabaseChangeListener((event) => {
      if (event.tableName === 'sync_outbox') void sync();
    });
    return () => {
      appState.remove();
      databaseChanges.remove();
    };
  }, [sync]);

  const value = useMemo(
    () => ({ configured, status, chooseSetup, retry: check }),
    [check, chooseSetup, configured, status],
  );
  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}
