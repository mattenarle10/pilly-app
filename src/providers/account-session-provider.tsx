import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { AccountUser } from '@/models/account';
import {
  isAccountSignInConfigured,
  restoreAccountSession,
  signInWithGoogle,
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
  error: 'sign-in' | 'sign-out' | null;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

export const AccountSessionContext = createContext<AccountSessionContextValue | null>(null);

export function AccountSessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AccountSessionState>({ kind: 'loading', user: null });
  const [busy, setBusy] = useState(false);
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

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await signInWithGoogle();
      if (!session) return false;
      setState({ kind: 'signed-in', user: session.user });
      return true;
    } catch {
      setError('sign-in');
      return false;
    } finally {
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
    () => ({ state, configured, busy, error, signIn, signOut }),
    [busy, configured, error, signIn, signOut, state],
  );

  return <AccountSessionContext.Provider value={value}>{children}</AccountSessionContext.Provider>;
}
