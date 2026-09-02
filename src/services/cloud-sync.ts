import type { PillySyncStore } from '@/storage/sync-store';

import { pushCloudMutations } from './cloud-sync-api';

export async function synchronizeCloudState(
  store: PillySyncStore,
  accountId: string,
): Promise<{ changeCount: number }> {
  const state = store.getOrCreateState();
  if (state.accountId !== accountId || state.migrationState !== 'active') {
    return { changeCount: 0 };
  }
  const response = await pushCloudMutations({
    deviceId: state.deviceId,
    cursor: state.cursor,
    mutations: store.listPendingMutations(accountId),
  });
  store.applySyncResponse(accountId, response);
  return { changeCount: response.changes.length };
}
