import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { plusEntitlementQueryKey, plusEntitlementSettingKey, plusQueryKey } from '@/hooks/use-plus';
import { useRepository } from '@/hooks/use-repository';
import { subscribeToPlusEntitlement } from '@/platform/purchases';

export function PlusEntitlementBridge() {
  const repository = useRepository();
  const queryClient = useQueryClient();

  useEffect(() => {
    let disposed = false;
    let unsubscribe: () => void = () => undefined;

    void subscribeToPlusEntitlement((active) => {
      if (disposed) return;
      void repository.setSetting(plusEntitlementSettingKey, `${active}`);
      queryClient.setQueryData(plusEntitlementQueryKey, `${active}`);
      void queryClient.invalidateQueries({ queryKey: plusQueryKey });
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
