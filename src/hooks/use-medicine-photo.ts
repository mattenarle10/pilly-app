import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MedicationImage, StagedMedicationImage } from '@/models/medication-image';
import {
  attachStagedMedicinePhoto,
  deleteCachedMedicinePhoto,
  medicinePhotoUri,
  selectMedicinePhoto,
  type MedicinePhotoSource,
} from '@/services/medicine-image-cache';
import { CloudSyncApiError } from '@/services/cloud-sync-api';
import {
  deleteRemoteMedicinePhoto,
  downloadMedicinePhoto,
  retryMedicinePhotoTransfer,
  uploadMedicinePhoto,
} from '@/services/medicine-image-transfer';

import { queryKeys } from './query-keys';
import { useAccountSession } from './use-account-session';
import { usePlus } from './use-plus';
import { useRepository } from './use-repository';

export function useMedicinePhoto(medicationId?: string) {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const account = useAccountSession();
  const plus = usePlus();
  const [staged, setStaged] = useState<StagedMedicationImage | null>(null);
  const accountId = account.state.kind === 'signed-in' ? account.state.user.id : null;
  const available = accountId !== null && plus.state.active;
  const query = useQuery({
    queryKey: queryKeys.medicationImage(medicationId ?? 'new'),
    queryFn: async () => {
      if (!medicationId) return null;
      const local = await repository.getMedicationImage(medicationId);
      if (local && medicinePhotoUri(local.cacheKey)) return local;
      if (!available || !accountId) return local;
      try {
        const restored = await downloadMedicinePhoto({ accountId, medicationId });
        await repository.saveMedicationImage(restored);
        return restored;
      } catch (error) {
        if (error instanceof CloudSyncApiError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: medicationId !== undefined,
    networkMode: 'always',
  });

  const setImageQuery = (id: string, image: MedicationImage | null) => {
    queryClient.setQueryData(queryKeys.medicationImage(id), image);
  };

  const persistStaged = async (
    id: string,
    nextStaged: StagedMedicationImage,
    waitForTransfer = true,
  ) => {
    if (!accountId || !plus.state.active) throw new Error('Pilly Plus is required for photos.');
    const previous = await repository.getMedicationImage(id);
    const attached = await attachStagedMedicinePhoto({
      accountId,
      medicationId: id,
      staged: nextStaged,
    });
    await repository.saveMedicationImage(attached);
    setImageQuery(id, attached);
    if (previous && previous.cacheKey !== attached.cacheKey) {
      deleteCachedMedicinePhoto(previous.cacheKey);
    }

    const transfer = async () => {
      try {
        const remoteVersion = await uploadMedicinePhoto(attached);
        await repository.updateMedicationImageTransfer({
          medicationId: id,
          state: 'uploaded',
          remoteVersion,
        });
        const uploaded = { ...attached, remoteVersion, transferState: 'uploaded' as const };
        setImageQuery(id, uploaded);
        return uploaded;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Photo upload failed.';
        await repository.updateMedicationImageTransfer({
          medicationId: id,
          state: 'failed',
          lastError: message,
        });
        setImageQuery(id, { ...attached, transferState: 'failed', lastError: message });
        throw error;
      }
    };
    if (waitForTransfer) return transfer();
    void transfer().catch(() => undefined);
    return attached;
  };

  const selectMutation = useMutation({
    mutationFn: async (source: MedicinePhotoSource) => {
      if (!available) throw new Error('Pilly Plus is required for photos.');
      const selection = await selectMedicinePhoto(source);
      if (selection.kind === 'permission-denied') {
        throw new Error(
          selection.canAskAgain
            ? 'Camera access is needed to take a medicine photo.'
            : 'Camera access is off. Allow it in iPhone Settings to take a photo.',
        );
      }
      if (selection.kind === 'unavailable') {
        throw new Error('A camera is not available on this device.');
      }
      if (selection.kind !== 'selected') return selection;
      if (!medicationId) {
        setStaged(selection.image);
        return selection;
      }
      await persistStaged(medicationId, selection.image);
      return selection;
    },
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!medicationId) throw new Error('Save the medicine before retrying its photo.');
      const image = await repository.getMedicationImage(medicationId);
      if (!image) return;
      setImageQuery(medicationId, await retryMedicinePhotoTransfer(repository, image));
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!medicationId) {
        if (staged) deleteCachedMedicinePhoto(staged.cacheKey);
        setStaged(null);
        return;
      }
      const image = await repository.getMedicationImage(medicationId);
      if (!image) return;
      deleteCachedMedicinePhoto(image.cacheKey);
      await repository.updateMedicationImageTransfer({
        medicationId,
        state: 'pendingDelete',
      });
      setImageQuery(medicationId, null);
      try {
        await deleteRemoteMedicinePhoto(medicationId);
        await repository.removeMedicationImage(medicationId);
      } catch (error) {
        await repository.updateMedicationImageTransfer({
          medicationId,
          state: 'pendingDelete',
          lastError: error instanceof Error ? error.message : 'Photo removal failed.',
        });
      }
    },
  });

  const image = query.data?.transferState === 'pendingDelete' ? null : query.data;
  const cacheKey = staged?.cacheKey ?? image?.cacheKey;

  return {
    available,
    accountId,
    image,
    staged,
    uri: cacheKey ? medicinePhotoUri(cacheKey) : null,
    isBusy: selectMutation.isPending || removeMutation.isPending || retryMutation.isPending,
    error:
      selectMutation.error ??
      retryMutation.error ??
      query.error ??
      (image?.transferState === 'failed' ? image.lastError : null),
    select: (source: MedicinePhotoSource) => selectMutation.mutateAsync(source),
    remove: () => removeMutation.mutateAsync(),
    retry: () => retryMutation.mutateAsync(),
    attachToMedication: (id: string) =>
      staged ? persistStaged(id, staged, false) : Promise.resolve(null),
  };
}
