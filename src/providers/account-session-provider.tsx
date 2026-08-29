import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { AccountProvider, AccountUser } from '@/models/account';
import {
  isAccountSignInConfigured,
  restoreAccountSession,
  signInWithProvider,
  signOutAccount,
} from '@/services/account-session';

export type AccountSessionState =
  | { kind: 'loading'; user: null }
  | { kind: 'local'; user: null }
  | { kind: 'signed-in'; user: AccountUser };

export type AccountSessionContextValue = {
  state: AccountSessionState;
  configured: boolean;
  busy: boolean;
  signingInWith: AccountProvider | null;
  error: 'sign-in' | 'sign-out' | null;
  signIn: (provider: AccountProvider) => Promise<boolean>;
  signOut: () => Promise<void>;
};

export const AccountSessionContext = createContext<AccountSessionContextValue | null>(null);

export function AccountSessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AccountSessionState>({ kind: 'loading', user: null });
  const [busy, setBusy] = useState(false);
  const [signingInWith, setSigningInWith] = useState<AccountProvider | null>(null);
  const [error, setError] = useState<AccountSessionContextValue['error']>(null);
  const configured = isAccountSignInConfigured();

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
      await signOutAccount();
      setState({ kind: 'local', user: null });
    } catch {
      setError('sign-out');
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({ state, configured, busy, signingInWith, error, signIn, signOut }),
    [busy, configured, error, signIn, signingInWith, signOut, state],
  );

  return <AccountSessionContext.Provider value={value}>{children}</AccountSessionContext.Provider>;
}
