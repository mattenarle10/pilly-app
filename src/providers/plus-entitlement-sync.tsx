import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/query-keys';
import { plusEntitlementSettingKey } from '@/hooks/use-plus';
import { useRepository } from '@/hooks/use-repository';
import { subscribeToPlusEntitlement } from '@/services/purchases';

export function PlusEntitlementSync() {
  const repository = useRepository();
  const queryClient = useQueryClient();

  useEffect(() => {
    let disposed = false;
    let unsubscribe: () => void = () => undefined;

    void subscribeToPlusEntitlement((active) => {
      if (disposed) return;
      void repository.setSetting(plusEntitlementSettingKey, `${active}`);
      queryClient.setQueryData(queryKeys.setting(plusEntitlementSettingKey), `${active}`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.plus.root });
    }).then((stop) => {
      if (disposed) stop();
      else unsubscribe = stop;
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [queryClient, repository]);

  return null;
}
