import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  medicineCollectionSettingKeys,
  parseMedicineCollectionSort,
  parseMedicineCollectionView,
  type MedicineCollectionSort,
  type MedicineCollectionView,
} from '@/models/medicine-collection';
import { medicinePhotoUri } from '@/services/medicine-image-cache';
import { queryKeys } from './query-keys';
import { useAccountSession } from './use-account-session';
import { usePlus } from './use-plus';
import { useRepository } from './use-repository';

export function useMedicineCollectionPreferences() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const viewQuery = useQuery({
    queryKey: queryKeys.setting(medicineCollectionSettingKeys.view),
    queryFn: () => repository.getSetting(medicineCollectionSettingKeys.view),
    networkMode: 'always',
  });
  const sortQuery = useQuery({
    queryKey: queryKeys.setting(medicineCollectionSettingKeys.sort),
    queryFn: () => repository.getSetting(medicineCollectionSettingKeys.sort),
    networkMode: 'always',
  });
  const preferenceMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      repository.setSetting(key, value),
    onSuccess: (_, { key, value }) => {
      queryClient.setQueryData(queryKeys.setting(key), value);
    },
  });

  return {
    view: parseMedicineCollectionView(viewQuery.data ?? null),
    sort: parseMedicineCollectionSort(sortQuery.data ?? null),
    isLoading: viewQuery.isLoading || sortQuery.isLoading,
    isSaving: preferenceMutation.isPending,
    setView: (view: MedicineCollectionView) =>
      preferenceMutation.mutate({ key: medicineCollectionSettingKeys.view, value: view }),
    setSort: (sort: MedicineCollectionSort) =>
      preferenceMutation.mutate({ key: medicineCollectionSettingKeys.sort, value: sort }),
  };
}

export function useMedicineCollectionPhotos() {
  const repository = useRepository();
  const account = useAccountSession();
  const plus = usePlus();
  const available = account.state.kind === 'signed-in' && plus.state.active;
  const images = useQuery({
    queryKey: queryKeys.medicationImages,
    queryFn: () => repository.listMedicationImages(),
    enabled: available,
    networkMode: 'always',
  });

  const photoUris = Object.fromEntries(
    (available ? (images.data ?? []) : [])
      .filter((image) => image.transferState !== 'pendingDelete')
      .map((image) => [image.medicationId, medicinePhotoUri(image.cacheKey)]),
  );

  return { available, photoUris, isLoading: available && images.isLoading };
}
