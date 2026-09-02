import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  normalizeProfileName,
  profileDisplayName,
  profileSettingKeys,
  resolveProfileName,
  type ProfileName,
} from '@/models/profile';

import { queryKeys } from './query-keys';
import { useMedicines } from './use-medicines';
import { useRepository } from './use-repository';

export function useProfileName() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const legacyName = useQuery({
    queryKey: queryKeys.setting(profileSettingKeys.displayName),
    queryFn: () => repository.getSetting(profileSettingKeys.displayName),
    networkMode: 'always',
  });
  const firstName = useQuery({
    queryKey: queryKeys.setting(profileSettingKeys.firstName),
    queryFn: () => repository.getSetting(profileSettingKeys.firstName),
    networkMode: 'always',
  });
  const lastName = useQuery({
    queryKey: queryKeys.setting(profileSettingKeys.lastName),
    queryFn: () => repository.getSetting(profileSettingKeys.lastName),
    networkMode: 'always',
  });
  const name = resolveProfileName({
    firstName: firstName.data,
    lastName: lastName.data,
    legacyDisplayName: legacyName.data,
  });
  const saveName = useMutation({
    mutationFn: async (draft: ProfileName) => {
      const normalized = normalizeProfileName(draft);
      await repository.saveProfileName(normalized.firstName, normalized.lastName);
      return normalized;
    },
    networkMode: 'always',
    onSuccess: (normalized) => {
      queryClient.setQueryData(
        queryKeys.setting(profileSettingKeys.firstName),
        normalized.firstName,
      );
      queryClient.setQueryData(queryKeys.setting(profileSettingKeys.lastName), normalized.lastName);
      queryClient.setQueryData(
        queryKeys.setting(profileSettingKeys.displayName),
        profileDisplayName(normalized),
      );
    },
  });
  const queries = [legacyName, firstName, lastName];

  return {
    name,
    displayName: profileDisplayName(name),
    isLoading: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    retry: () => Promise.all(queries.map((query) => query.refetch())),
    saveName,
  };
}

export function useProfile() {
  const profileName = useProfileName();
  const medicines = useMedicines();

  return {
    ...profileName,
    archivedCount: medicines.data?.filter((medicine) => medicine.archivedAt !== null).length ?? 0,
    isLoading: profileName.isLoading || medicines.isPending,
    isError: profileName.isError || medicines.isError,
    retry: () => Promise.all([profileName.retry(), medicines.refetch()]),
  };
}
