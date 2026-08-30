import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/query-keys';
import { plusEntitlementSettingKey } from '@/hooks/use-plus';
import { useAccountSession } from '@/hooks/use-account-session';
import { useRepository } from '@/hooks/use-repository';
import { disconnectPlusPurchasesIdentity, subscribeToPlusEntitlement } from '@/services/purchases';

export function PlusEntitlementSync() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const account = useAccountSession();
  const accountId = account.state.kind === 'signed-in' ? account.state.user.id : null;

  useEffect(() => {
    if (!accountId) {
      void disconnectPlusPurchasesIdentity().catch(() => undefined);
      return;
    }
    let disposed = false;
    let unsubscribe: () => void = () => undefined;
    const entitlementSettingKey = plusEntitlementSettingKey(accountId);

    void subscribeToPlusEntitlement(accountId, (active) => {
      if (disposed) return;
      void repository.setSetting(entitlementSettingKey, `${active}`);
      queryClient.setQueryData(queryKeys.setting(entitlementSettingKey), `${active}`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.plus.root });
    })
      .then((stop) => {
        if (disposed) stop();
        else unsubscribe = stop;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [accountId, queryClient, repository]);

  return null;
}
