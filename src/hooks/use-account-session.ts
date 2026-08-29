import { useContext } from 'react';

import { AccountSessionContext } from '@/providers/account-session-provider';

export function useAccountSession() {
  const account = useContext(AccountSessionContext);
  if (!account) throw new Error('useAccountSession must be used within AccountSessionProvider.');
  return account;
}
