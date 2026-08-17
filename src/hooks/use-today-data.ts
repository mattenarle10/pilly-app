import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { profileSettingKeys, resolveProfileName } from '@/models/profile';
import { toLocalDate, weekStartingToday } from '@/models/schedule';
import { appNow } from '@/services/app-clock';
import { queryKeys } from './query-keys';
import { useRepository } from './use-repository';
import { useWeekDoses } from './use-week-doses';

export function useTodayData() {
  const repository = useRepository();
  const today = useMemo(() => appNow(), []);
  const dates = useMemo(() => weekStartingToday(today), [today]);
  const doses = useQuery({
    queryKey: queryKeys.scheduledDoses.date(toLocalDate(today)),
    queryFn: () => repository.listScheduledDoses(today),
    networkMode: 'always',
  });
  const weekDoses = useWeekDoses(dates);
  const medicines = useQuery({
    queryKey: queryKeys.medications.active,
    queryFn: () => repository.listMedications(),
    networkMode: 'always',
  });
  const reminderNotice = useQuery({
    queryKey: queryKeys.setting('reminderNotice'),
    queryFn: () => repository.getSetting('reminderNotice'),
    networkMode: 'always',
  });
  const profileFirstName = useQuery({
    queryKey: queryKeys.setting(profileSettingKeys.firstName),
    queryFn: () => repository.getSetting(profileSettingKeys.firstName),
    networkMode: 'always',
  });
  const legacyProfileName = useQuery({
    queryKey: queryKeys.setting(profileSettingKeys.displayName),
    queryFn: () => repository.getSetting(profileSettingKeys.displayName),
    networkMode: 'always',
  });
  const resolvedProfile = resolveProfileName({
    firstName: profileFirstName.data,
    lastName: null,
    legacyDisplayName: legacyProfileName.data,
  });

  return {
    repository,
    today,
    dates,
    doses,
    weekDoses,
    medicines,
    reminderNotice,
    firstName: resolvedProfile.firstName,
  };
}
