import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  arePlusPurchasesEnabled,
  getPlusPreviewMode,
  isPlusPurchasesSupported,
  loadPlusStoreSnapshot,
  managePlusSubscription,
  purchasePlus,
  restorePlus,
  type PlusActionResult,
  type PlusOffer,
  type PlusPlan,
} from '@/services/purchases';

import { queryKeys } from './query-keys';
import { useAccountSession } from './use-account-session';
import { useRepository } from './use-repository';

export function plusEntitlementSettingKey(accountId: string): string {
  return `plusEntitled:${accountId}`;
}

export type PlusState =
  | { kind: 'loading'; active: false; canRestore: false }
  | { kind: 'preview'; active: boolean; canRestore: false }
  | { kind: 'active'; active: true; canRestore: boolean; offline: boolean }
  | {
      kind: 'available';
      active: false;
      canRestore: true;
      offers: Record<PlusPlan, PlusOffer | null>;
    }
  | { kind: 'unavailable'; active: false; canRestore: boolean; reason: 'gate' | 'store' }
  | { kind: 'error'; active: false; canRestore: true };

type UsePlusOptions = {
  loadAnonymousOffers?: boolean;
};

export function usePlus({ loadAnonymousOffers = false }: UsePlusOptions = {}) {
  const account = useAccountSession();
  const repository = useRepository();
  const queryClient = useQueryClient();
  const previewMode = getPlusPreviewMode();
  const accountId = account.state.kind === 'signed-in' ? account.state.user.id : null;
  const shouldLoadStore = previewMode === 'store' && (accountId !== null || loadAnonymousOffers);
  const entitlementSettingKey = accountId ? plusEntitlementSettingKey(accountId) : null;
  const cachedEntitlement = useQuery({
    queryKey: queryKeys.setting(entitlementSettingKey ?? 'plusEntitled:local'),
    queryFn: () =>
      entitlementSettingKey ? repository.getSetting(entitlementSettingKey) : Promise.resolve(null),
    enabled: entitlementSettingKey !== null,
    networkMode: 'always',
  });
  const store = useQuery({
    queryKey: queryKeys.plus.store(accountId ?? 'local'),
    queryFn: async () => {
      const snapshot = await loadPlusStoreSnapshot(accountId ?? undefined);
      if (snapshot.kind === 'ready' && entitlementSettingKey) {
        await repository.setSetting(entitlementSettingKey, `${snapshot.active}`);
        queryClient.setQueryData(queryKeys.setting(entitlementSettingKey), `${snapshot.active}`);
      }
      return snapshot;
    },
    enabled: shouldLoadStore,
    networkMode: 'always',
  });

  const acceptResult = async (result: PlusActionResult) => {
    if (result.kind !== 'active') return result;
    if (!entitlementSettingKey) throw new Error('Sign in before using Pilly Plus.');
    await repository.setSetting(entitlementSettingKey, 'true');
    queryClient.setQueryData(queryKeys.setting(entitlementSettingKey), 'true');
    await queryClient.invalidateQueries({ queryKey: queryKeys.plus.root });
    return result;
  };
  const purchase = useMutation({
    mutationFn: async (plan: PlusPlan) => {
      if (!accountId) throw new Error('Sign in before using Pilly Plus.');
      return acceptResult(await purchasePlus(accountId, plan));
    },
  });
  const restore = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error('Sign in before using Pilly Plus.');
      return acceptResult(await restorePlus(accountId));
    },
  });
  const manage = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error('Sign in before managing Pilly Plus.');
      await managePlusSubscription(accountId);
    },
  });
  const cachedActive =
    accountId !== null && isPlusPurchasesSupported() && cachedEntitlement.data === 'true';

  let state: PlusState;
  if (previewMode !== 'store') {
    state = { kind: 'preview', active: previewMode === 'active', canRestore: false };
  } else if (!accountId && !loadAnonymousOffers) {
    state = { kind: 'unavailable', active: false, canRestore: false, reason: 'store' };
  } else if (accountId && cachedEntitlement.isPending) {
    state = { kind: 'loading', active: false, canRestore: false };
  } else if (store.isPending && cachedActive) {
    state = { kind: 'active', active: true, canRestore: false, offline: true };
  } else if (store.isPending) {
    state = { kind: 'loading', active: false, canRestore: false };
  } else if (store.isError) {
    state = cachedActive
      ? { kind: 'active', active: true, canRestore: true, offline: true }
      : { kind: 'error', active: false, canRestore: true };
  } else if (store.data?.kind === 'unconfigured' && cachedActive) {
    state = { kind: 'active', active: true, canRestore: false, offline: true };
  } else if (accountId && store.data?.kind === 'ready' && store.data.active) {
    state = { kind: 'active', active: true, canRestore: true, offline: false };
  } else if (
    store.data?.kind === 'ready' &&
    Object.values(store.data.offers).some(Boolean) &&
    arePlusPurchasesEnabled()
  ) {
    state = { kind: 'available', active: false, canRestore: true, offers: store.data.offers };
  } else if (store.data?.kind === 'ready') {
    state = {
      kind: 'unavailable',
      active: false,
      canRestore: true,
      reason: Object.values(store.data.offers).some(Boolean) ? 'gate' : 'store',
    };
  } else {
    state = { kind: 'unavailable', active: false, canRestore: false, reason: 'store' };
  }

  return {
    state,
    purchase,
    restore,
    manage,
    retry: () =>
      accountId
        ? Promise.all([cachedEntitlement.refetch(), store.refetch()])
        : shouldLoadStore
          ? Promise.all([store.refetch()])
          : Promise.resolve([]),
  };
}
