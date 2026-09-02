import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cachedProfileAvatarUri,
  deletePreparedProfileAvatar,
  purgeProfileAvatarCacheForAccount,
  selectProfileAvatar,
  storeProfileAvatar,
  type ProfileAvatarSource,
} from '@/services/profile-avatar-cache';
import { CloudSyncApiError } from '@/services/cloud-sync-api';
import {
  deleteRemoteProfileAvatar,
  downloadProfileAvatar,
  uploadProfileAvatar,
} from '@/services/profile-avatar-transfer';

import { queryKeys } from './query-keys';
import { useAccountSession } from './use-account-session';
import { usePlus } from './use-plus';

export function useProfileAvatar() {
  const account = useAccountSession();
  const plus = usePlus();
  const queryClient = useQueryClient();
  const accountId = account.state.kind === 'signed-in' ? account.state.user.id : null;
  const canUpload = accountId !== null && plus.state.active;
  const query = useQuery({
    queryKey: queryKeys.profileAvatar(accountId ?? 'local'),
    queryFn: async () => {
      if (!accountId) return null;
      const cached = await cachedProfileAvatarUri(accountId);
      try {
        return await downloadProfileAvatar(accountId);
      } catch (error) {
        if (error instanceof CloudSyncApiError && error.status === 404) {
          await purgeProfileAvatarCacheForAccount(accountId);
          return null;
        }
        if (cached) return cached;
        throw error;
      }
    },
    enabled: accountId !== null,
    networkMode: 'always',
  });

  const select = useMutation({
    mutationFn: async (source: ProfileAvatarSource) => {
      if (!accountId || !canUpload) throw new Error('Pilly Plus is required for a profile photo.');
      const selection = await selectProfileAvatar(source);
      if (selection.kind === 'permission-denied') {
        throw new Error(
          selection.canAskAgain
            ? 'Camera access is needed to take a profile photo.'
            : 'Camera access is off. Allow it in iPhone Settings to take a photo.',
        );
      }
      if (selection.kind === 'unavailable') throw new Error('A camera is not available here.');
      if (selection.kind !== 'selected') return;
      try {
        await uploadProfileAvatar(selection.avatar);
        const uri = await storeProfileAvatar(accountId, selection.avatar.uri);
        queryClient.setQueryData(queryKeys.profileAvatar(accountId), uri);
      } catch (error) {
        deletePreparedProfileAvatar(selection.avatar.uri);
        throw error;
      }
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!accountId) return;
      await deleteRemoteProfileAvatar();
      await purgeProfileAvatarCacheForAccount(accountId);
      queryClient.setQueryData(queryKeys.profileAvatar(accountId), null);
    },
  });

  return {
    uri: query.data ?? null,
    canUpload,
    plusActive: plus.state.active,
    isBusy: select.isPending || remove.isPending,
    error: select.error ?? remove.error ?? query.error,
    select: (source: ProfileAvatarSource) => select.mutateAsync(source),
    remove: () => remove.mutateAsync(),
    retry: () => query.refetch(),
  };
}
