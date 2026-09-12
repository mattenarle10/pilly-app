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
import {
  CloudSyncApiError,
  fetchCloudBootstrap,
  isCloudSyncConfigured,
} from '@/services/cloud-sync-api';
import { synchronizeCloudState } from '@/services/cloud-sync';
import { reconcileLocalReminders } from '@/services/notifications';
import { waitForActivePlusEntitlement } from '@/services/plus-activation';
import { PillyRepository } from '@/storage/repository';
import { PillySyncStore, type CloudSetupMode } from '@/storage/sync-store';

export type CloudSyncStatus =
  | { kind: 'local' }
  | { kind: 'checking' }
  | { kind: 'entitlement-required' }
  | { kind: 'activation-pending'; retrying: boolean }
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
  refreshAfterPurchase: () => Promise<boolean>;
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
  const accountRef = useRef(account.state);

  useEffect(() => {
    accountRef.current = account.state;
  }, [account.state]);

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
        if (error instanceof CloudSyncApiError && error.code === 'plus-required') {
          setStatus({ kind: 'entitlement-required' });
          return;
        }
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

  const applyBootstrap = useCallback(
    async (accountId: string, bootstrap: BootstrapResponse) => {
      bootstrapRef.current = bootstrap;
      if (!bootstrap.entitlement.isActive) {
        setStatus({ kind: 'entitlement-required' });
        return;
      }
      const migrationState = store.resolveSetupState(accountId, bootstrap.hasCloudData);
      if (migrationState === 'active') {
        if (!store.getOrCreateState().accountId) {
          store.configureAccount(accountId, 'empty', bootstrap);
        }
        setStatus({ kind: 'active', syncing: false, lastError: null });
        await sync();
      } else if (migrationState === 'pendingBackup') setStatus({ kind: 'pending-backup' });
      else if (migrationState === 'pendingRestore') setStatus({ kind: 'pending-restore' });
      else if (migrationState === 'pendingMerge') setStatus({ kind: 'pending-merge' });
      else if (migrationState === 'blockedAccount') setStatus({ kind: 'blocked-account' });
    },
    [store, sync],
  );

  const check = useCallback(async () => {
    if (account.state.kind === 'loading') {
      setStatus({ kind: 'checking' });
      return;
    }
    if (account.state.kind === 'local') {
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
      await applyBootstrap(account.state.user.id, bootstrap);
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Cloud backup is unavailable.',
      });
    }
  }, [account.state, applyBootstrap, configured, store]);

  const refreshAfterPurchase = useCallback(async () => {
    const currentAccount = accountRef.current;
    if (currentAccount.kind !== 'signed-in' || !configured) return false;
    const accountId = currentAccount.user.id;
    setStatus({ kind: 'activation-pending', retrying: true });
    const bootstrap = await waitForActivePlusEntitlement(fetchCloudBootstrap);
    const latestAccount = accountRef.current;
    if (latestAccount.kind !== 'signed-in' || latestAccount.user.id !== accountId) return false;
    if (!bootstrap) {
      setStatus({ kind: 'activation-pending', retrying: false });
      return false;
    }
    await applyBootstrap(accountId, bootstrap);
    return true;
  }, [applyBootstrap, configured]);

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
    () => ({ configured, status, chooseSetup, refreshAfterPurchase, retry: check }),
    [check, chooseSetup, configured, refreshAfterPurchase, status],
  );
  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}
