import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  normalizeProfileName,
  profileDisplayName,
  profileSettingKeys,
  resolveProfileName,
  type ProfileName,
} from '@/models/profile';

import { useMedicines } from './use-medicines';
import { useRepository } from './use-repository';

const settingQueryKey = (key: string) => ['settings', key] as const;

export function useProfile() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const legacyName = useQuery({
    queryKey: settingQueryKey(profileSettingKeys.displayName),
    queryFn: () => repository.getSetting(profileSettingKeys.displayName),
    networkMode: 'always',
  });
  const firstName = useQuery({
    queryKey: settingQueryKey(profileSettingKeys.firstName),
    queryFn: () => repository.getSetting(profileSettingKeys.firstName),
    networkMode: 'always',
  });
  const lastName = useQuery({
    queryKey: settingQueryKey(profileSettingKeys.lastName),
    queryFn: () => repository.getSetting(profileSettingKeys.lastName),
    networkMode: 'always',
  });
  const medicines = useMedicines();
  const name = resolveProfileName({
    firstName: firstName.data,
    lastName: lastName.data,
    legacyDisplayName: legacyName.data,
  });
  const saveName = useMutation({
    mutationFn: async (draft: ProfileName) => {
      const normalized = normalizeProfileName(draft);
      await Promise.all([
        repository.setSetting(profileSettingKeys.firstName, normalized.firstName),
        repository.setSetting(profileSettingKeys.lastName, normalized.lastName),
        repository.setSetting(profileSettingKeys.displayName, profileDisplayName(normalized)),
      ]);
      return normalized;
    },
    networkMode: 'always',
    onSuccess: (normalized) => {
      queryClient.setQueryData(settingQueryKey(profileSettingKeys.firstName), normalized.firstName);
      queryClient.setQueryData(settingQueryKey(profileSettingKeys.lastName), normalized.lastName);
      queryClient.setQueryData(
        settingQueryKey(profileSettingKeys.displayName),
        profileDisplayName(normalized),
      );
    },
  });
  const queries = [legacyName, firstName, lastName, medicines];

  return {
    name,
    displayName: profileDisplayName(name),
    archivedCount: medicines.data?.filter((medicine) => medicine.archivedAt !== null).length ?? 0,
    isLoading: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    retry: () => Promise.all(queries.map((query) => query.refetch())),
    saveName,
  };
}
