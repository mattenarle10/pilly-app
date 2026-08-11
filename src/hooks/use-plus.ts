import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  arePlusPurchasesEnabled,
  getPlusPreviewMode,
  loadPlusStoreSnapshot,
  purchasePlus,
  restorePlus,
  type PlusActionResult,
  type PlusOffer,
} from '@/platform/purchases';

import { useRepository } from './use-repository';

export const plusQueryKey = ['plus'] as const;
export const plusEntitlementSettingKey = 'plusEntitled';
export const plusEntitlementQueryKey = ['settings', plusEntitlementSettingKey] as const;

export type PlusState =
  | { kind: 'loading'; active: false; canRestore: false }
  | { kind: 'preview'; active: boolean; canRestore: false }
  | { kind: 'active'; active: true; canRestore: boolean; offline: boolean }
  | { kind: 'available'; active: false; canRestore: true; offer: PlusOffer }
  | { kind: 'unavailable'; active: false; canRestore: boolean; reason: 'gate' | 'store' }
  | { kind: 'error'; active: false; canRestore: true };

export function usePlus() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const previewMode = getPlusPreviewMode();
  const cachedEntitlement = useQuery({
    queryKey: plusEntitlementQueryKey,
    queryFn: () => repository.getSetting(plusEntitlementSettingKey),
    networkMode: 'always',
  });
  const store = useQuery({
    queryKey: [...plusQueryKey, 'store'],
    queryFn: async () => {
      const snapshot = await loadPlusStoreSnapshot();
      if (snapshot.kind === 'ready') {
        await repository.setSetting(plusEntitlementSettingKey, `${snapshot.active}`);
        queryClient.setQueryData(plusEntitlementQueryKey, `${snapshot.active}`);
      }
      return snapshot;
    },
    enabled: previewMode === 'store',
    networkMode: 'always',
  });

  const acceptResult = async (result: PlusActionResult) => {
    if (result.kind !== 'active') return result;
    await repository.setSetting(plusEntitlementSettingKey, 'true');
    queryClient.setQueryData(plusEntitlementQueryKey, 'true');
    await queryClient.invalidateQueries({ queryKey: plusQueryKey });
    return result;
  };
  const purchase = useMutation({ mutationFn: async () => acceptResult(await purchasePlus()) });
  const restore = useMutation({ mutationFn: async () => acceptResult(await restorePlus()) });
  const cachedActive = cachedEntitlement.data === 'true';

  let state: PlusState;
  if (previewMode !== 'store') {
    state = { kind: 'preview', active: previewMode === 'active', canRestore: false };
  } else if (cachedEntitlement.isPending || store.isPending) {
    state = { kind: 'loading', active: false, canRestore: false };
  } else if (store.isError) {
    state = cachedActive
      ? { kind: 'active', active: true, canRestore: true, offline: true }
      : { kind: 'error', active: false, canRestore: true };
  } else if (store.data?.kind === 'unconfigured' && cachedActive) {
    state = { kind: 'active', active: true, canRestore: false, offline: true };
  } else if (store.data?.kind === 'ready' && store.data.active) {
    state = { kind: 'active', active: true, canRestore: true, offline: false };
  } else if (store.data?.kind === 'ready' && store.data.offer && arePlusPurchasesEnabled()) {
    state = { kind: 'available', active: false, canRestore: true, offer: store.data.offer };
  } else if (store.data?.kind === 'ready') {
    state = {
      kind: 'unavailable',
      active: false,
      canRestore: true,
      reason: store.data.offer ? 'gate' : 'store',
    };
  } else {
    state = { kind: 'unavailable', active: false, canRestore: false, reason: 'store' };
  }

  return {
    state,
    purchase,
    restore,
    retry: () => Promise.all([cachedEntitlement.refetch(), store.refetch()]),
  };
}
