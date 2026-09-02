import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import type { AccountProvider, AccountUser } from '@/models/account';
import {
  isAccountSignInConfigured,
  restoreAccountSession,
  signInWithProvider,
  signOutAccount,
} from '@/services/account-session';
import { deleteCloudAccount } from '@/services/cloud-sync-api';
import {
  deleteCachedMedicinePhoto,
  purgeMedicinePhotoCacheForAccount,
} from '@/services/medicine-image-cache';
import { reconcileLocalReminders } from '@/services/notifications';
import { purgeProfileAvatarCacheForAccount } from '@/services/profile-avatar-cache';
import { PillyRepository } from '@/storage/repository';
import { PillySyncStore } from '@/storage/sync-store';

export type AccountSessionState =
  | { kind: 'loading'; user: null }
  | { kind: 'local'; user: null }
  | { kind: 'signed-in'; user: AccountUser };

export type AccountSessionContextValue = {
  state: AccountSessionState;
  configured: boolean;
  busy: boolean;
  signingInWith: AccountProvider | null;
  error: 'sign-in' | 'sign-out' | 'delete' | null;
  signIn: (provider: AccountProvider) => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
};

export const AccountSessionContext = createContext<AccountSessionContextValue | null>(null);

export function AccountSessionProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new PillyRepository(database), [database]);
  const syncStore = useMemo(() => new PillySyncStore(database), [database]);
  const [state, setState] = useState<AccountSessionState>({ kind: 'loading', user: null });
  const [busy, setBusy] = useState(false);
  const [signingInWith, setSigningInWith] = useState<AccountProvider | null>(null);
  const [error, setError] = useState<AccountSessionContextValue['error']>(null);
  const configured = isAccountSignInConfigured();

  const clearAccountBoundState = useCallback(
    async (accountId: string) => {
      syncStore.clearAccount(accountId);
      const images = await repository.clearMedicationImages();
      images.forEach((image) => deleteCachedMedicinePhoto(image.cacheKey));
      await purgeMedicinePhotoCacheForAccount(accountId);
      await purgeProfileAvatarCacheForAccount(accountId);
      await repository.deleteSetting(`plusEntitled:${accountId}`);
      queryClient.clear();
    },
    [queryClient, repository, syncStore],
  );

  const clearSignedOutAccount = useCallback(
    async (accountId: string) => {
      const images = await repository.clearTrackedData();
      images.forEach((image) => deleteCachedMedicinePhoto(image.cacheKey));
      await purgeMedicinePhotoCacheForAccount(accountId);
      await purgeProfileAvatarCacheForAccount(accountId);
      await repository.deleteSetting(`plusEntitled:${accountId}`);
      await reconcileLocalReminders(repository);
      queryClient.clear();
    },
    [queryClient, repository],
  );

  useEffect(() => {
    let active = true;
    void restoreAccountSession()
      .then((session) => {
        if (!active) return;
        setState(
          session ? { kind: 'signed-in', user: session.user } : { kind: 'local', user: null },
        );
      })
      .catch(() => {
        if (active) setState({ kind: 'local', user: null });
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (provider: AccountProvider) => {
    setBusy(true);
    setSigningInWith(provider);
    setError(null);
    try {
      const session = await signInWithProvider(provider);
      if (!session) return false;
      setState({ kind: 'signed-in', user: session.user });
      return true;
    } catch {
      setError('sign-in');
      return false;
    } finally {
      setSigningInWith(null);
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const accountId = state.kind === 'signed-in' ? state.user.id : null;
      if (accountId) await clearSignedOutAccount(accountId);
      await signOutAccount();
      setState({ kind: 'local', user: null });
    } catch {
      setError('sign-out');
    } finally {
      setBusy(false);
    }
  }, [clearSignedOutAccount, state]);

  const deleteAccount = useCallback(async () => {
    if (state.kind !== 'signed-in') return false;
    setBusy(true);
    setError(null);
    const accountId = state.user.id;
    try {
      await deleteCloudAccount();
      setState({ kind: 'local', user: null });
      await Promise.allSettled([signOutAccount(), clearAccountBoundState(accountId)]);
      return true;
    } catch {
      setError('delete');
      return false;
    } finally {
      setBusy(false);
    }
  }, [clearAccountBoundState, state]);

  const value = useMemo(
    () => ({ state, configured, busy, signingInWith, error, signIn, signOut, deleteAccount }),
    [busy, configured, deleteAccount, error, signIn, signingInWith, signOut, state],
  );

  return <AccountSessionContext.Provider value={value}>{children}</AccountSessionContext.Provider>;
}
