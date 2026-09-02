import { useContext } from 'react';

import { CloudSyncContext } from '@/providers/cloud-sync-provider';

export function useCloudSync() {
  const cloud = useContext(CloudSyncContext);
  if (!cloud) throw new Error('useCloudSync must be used within CloudSyncProvider.');
  return cloud;
}
