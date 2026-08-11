import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { profileSettingKeys, resolveProfileName } from '@/models/profile';
import { toLocalDate, weekStartingToday } from '@/models/schedule';
import { activeMedicinesQueryKey } from './use-medicines';
import { useRepository } from './use-repository';

export function useTodayData() {
  const repository = useRepository();
  const today = useMemo(() => new Date(), []);
  const dates = useMemo(() => weekStartingToday(today), [today]);
  const doses = useQuery({
    queryKey: ['scheduled-doses', toLocalDate(today)],
    queryFn: () => repository.listScheduledDoses(today),
    networkMode: 'always',
  });
  const weekDoses = useQuery({
    queryKey: ['organizer-week', toLocalDate(today)],
    queryFn: () => Promise.all(dates.map((date) => repository.listScheduledDoses(date))),
    networkMode: 'always',
  });
  const medicines = useQuery({
    queryKey: activeMedicinesQueryKey,
    queryFn: () => repository.listMedications(),
    networkMode: 'always',
  });
  const reminderNotice = useQuery({
    queryKey: ['settings', 'reminderNotice'],
    queryFn: () => repository.getSetting('reminderNotice'),
    networkMode: 'always',
  });
  const profileFirstName = useQuery({
    queryKey: ['settings', profileSettingKeys.firstName],
    queryFn: () => repository.getSetting(profileSettingKeys.firstName),
    networkMode: 'always',
  });
  const legacyProfileName = useQuery({
    queryKey: ['settings', profileSettingKeys.displayName],
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
