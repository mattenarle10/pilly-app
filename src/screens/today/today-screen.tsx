import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import type { ScheduledDose } from '@/data/repositories';
import {
  PillyBanner,
  PillyButton,
  PillyCard,
  PillyIconButton,
  PillyIconTile,
  PillyModal,
  PillyText,
  Screen,
  StatusLabel,
  TodayStarter,
  WeekStatusStrip,
} from '@/design/components';
import { PillyIcon } from '@/design/icons';
import type { OrganizerDay } from '@/design/illustrations';
import { colors, radii, spacing } from '@/design/tokens';
import { formatTime, toLocalDate, weekStartingToday } from '@/domain/schedule';
import { estimatedDaysLeft } from '@/domain/supply';
import { useRepository } from '@/providers';

const countBits = (value: number) =>
  value
    .toString(2)
    .split('')
    .filter((bit) => bit === '1').length;

export function TodayScreen() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const [correction, setCorrection] = useState<ScheduledDose | null>(null);
  const [recentAction, setRecentAction] = useState<ScheduledDose | null>(null);
  const today = useMemo(() => new Date(), []);
  const dates = useMemo(() => weekStartingToday(today), [today]);
  const query = useQuery({
    queryKey: ['scheduled-doses', toLocalDate(today)],
    queryFn: () => repository.listScheduledDoses(today),
    networkMode: 'always',
  });
  const weekQuery = useQuery({
    queryKey: ['organizer-week', toLocalDate(today)],
    queryFn: () => Promise.all(dates.map((date) => repository.listScheduledDoses(date))),
    networkMode: 'always',
  });
  const medicines = useQuery({
    queryKey: ['medications'],
    queryFn: () => repository.listMedications(),
    networkMode: 'always',
  });
  const reminderNotice = useQuery({
    queryKey: ['settings', 'reminderNotice'],
    queryFn: () => repository.getSetting('reminderNotice'),
    networkMode: 'always',
  });
  const profileName = useQuery({
    queryKey: ['settings', 'profileName'],
    queryFn: () => repository.getSetting('profileName'),
    networkMode: 'always',
  });
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: ({
      dose,
      status,
    }: {
      dose: ScheduledDose;
      status: 'taken' | 'skipped' | 'notRecorded';
    }) =>
      status === 'notRecorded' ? repository.undoDose(dose) : repository.recordDose(dose, status),
    onSuccess: (_, variables) => {
      setRecentAction(variables.status === 'notRecorded' ? null : variables.dose);
      return queryClient.invalidateQueries({ queryKey: ['scheduled-doses'] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['organizer-week'] }),
  });
  const organizerDays: (OrganizerDay & { dateNumber: number })[] = dates.map((date, index) => {
    const doses = weekQuery.data?.[index] ?? [];
    const state =
      doses.length === 0
        ? 'empty'
        : doses.every((dose) => dose.status === 'taken')
          ? 'taken'
          : doses.some((dose) => dose.status === 'skipped')
            ? 'skipped'
            : 'notRecorded';
    return {
      key: toLocalDate(date),
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
      dateNumber: date.getDate(),
      state,
    };
  });
  const greeting =
    today.getHours() < 12
      ? 'Good morning'
      : today.getHours() < 18
        ? 'Good afternoon'
        : 'Good evening';
  const greetingText = profileName.data?.trim()
    ? `${greeting}, ${profileName.data.trim()}`
    : greeting;
  const nextScheduledDay = organizerDays.slice(1).find((day) => day.state !== 'empty');
  const correctDose = () => {
    if (!correction) return;
    mutation.mutate({ dose: correction, status: 'notRecorded' });
    setCorrection(null);
  };

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <PillyText role="label" style={styles.greeting}>
            {greetingText}
          </PillyText>
          <PillyText role="large-title">Today</PillyText>
          <PillyText role="caption" muted>
            {new Intl.DateTimeFormat(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(today)}
          </PillyText>
        </View>
        <PillyIconButton icon="profile" label="Profile" onPress={() => router.push('/profile')} />
      </View>
      <View style={styles.weekSection}>
        <View style={styles.sectionHeading}>
          <PillyText role="headline">Next 7 days</PillyText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View week"
            onPress={() => router.push('/(tabs)/week')}
            style={({ pressed }) => [styles.weekLink, pressed && styles.weekLinkPressed]}
          >
            <PillyText role="caption" style={styles.weekLinkText}>
              View week
            </PillyText>
            <PillyIcon name="next" size={15} color={colors.brand} />
          </Pressable>
        </View>
        <WeekStatusStrip
          days={organizerDays}
          onDayPress={(index) =>
            router.push({ pathname: '/(tabs)/week', params: { day: `${index}` } })
          }
        />
      </View>
      {reminderNotice.data === 'denied' || reminderNotice.data === 'failed' ? (
        <PillyBanner
          kind="warning"
          title="Reminder is off"
          message={
            reminderNotice.data === 'denied'
              ? 'Allow notifications in iPhone Settings.'
              : 'The medicine saved, but its reminder did not.'
          }
          actionLabel="Dismiss"
          onAction={async () => {
            await repository.setSetting('reminderNotice', 'none');
            await reminderNotice.refetch();
          }}
        />
      ) : null}
      {query.isLoading ? <PillyBanner message="Loading today…" /> : null}
      {query.isError ? (
        <PillyBanner
          kind="error"
          title="Couldn’t load today"
          message="Your data is still on this iPhone."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {medicines.isError ? (
        <PillyBanner kind="error" message="Couldn’t check your medicines." compact />
      ) : null}
      {mutation.isError ? (
        <PillyBanner kind="error" title="Change not saved" message="Try that action again." />
      ) : null}
      {recentAction ? (
        <PillyBanner
          kind="success"
          title="Recorded"
          message="You can undo this change."
          actionLabel="Undo"
          onAction={() => mutation.mutate({ dose: recentAction, status: 'notRecorded' })}
          compact
        />
      ) : null}
      {query.data?.length === 0 && medicines.data?.length === 0 ? (
        <TodayStarter onPress={() => router.push('/medicine/new')} />
      ) : null}
      {query.data?.length === 0 && medicines.data && medicines.data.length > 0 ? (
        <PillyCard tone="peach" padding="medium" style={styles.restDay}>
          <PillyIconTile icon="calendar" tone="peach" />
          <View style={styles.restCopy}>
            <PillyText role="headline">Nothing due today</PillyText>
            <PillyText role="caption" muted>
              {nextScheduledDay
                ? `Next on ${nextScheduledDay.label}.`
                : 'No doses in the next week.'}
            </PillyText>
          </View>
        </PillyCard>
      ) : null}
      <View style={styles.list}>
        {query.data?.map((dose) => {
          const daysLeft = estimatedDaysLeft(
            dose.medication.supplyCount,
            countBits(dose.schedule.weekdayMask),
          );
          return (
            <PillyCard key={dose.occurrenceId} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardCopy}>
                  <PillyText role="headline">{dose.medication.name}</PillyText>
                  <PillyText>{formatTime(dose.schedule.hour, dose.schedule.minute)}</PillyText>
                  {dose.medication.instructions ? (
                    <PillyText role="caption" muted>
                      {dose.medication.instructions}
                    </PillyText>
                  ) : null}
                </View>
                <StatusLabel status={dose.status} />
              </View>
              {daysLeft !== null ? (
                <PillyText role="caption" muted>
                  About {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </PillyText>
              ) : null}
              {dose.status === 'notRecorded' ? (
                <View style={styles.actions}>
                  <PillyButton
                    label="Taken"
                    icon="done"
                    size="medium"
                    loading={mutation.isPending}
                    onPress={() => mutation.mutate({ dose, status: 'taken' })}
                    style={styles.action}
                  />
                  <PillyButton
                    label="Skip"
                    icon="remove"
                    size="medium"
                    variant="secondary"
                    disabled={mutation.isPending}
                    onPress={() => mutation.mutate({ dose, status: 'skipped' })}
                    style={styles.action}
                  />
                </View>
              ) : (
                <PillyButton
                  label="Change status"
                  icon="edit"
                  size="medium"
                  variant="secondary"
                  onPress={() => setCorrection(dose)}
                  fullWidth
                />
              )}
            </PillyCard>
          );
        })}
      </View>
      <PillyModal
        visible={correction !== null}
        title="Change this record?"
        message="It will return to Not yet. You can record it again."
        confirmLabel="Change"
        onConfirm={correctDose}
        onClose={() => setCorrection(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
  },
  titleCopy: { flex: 1, gap: spacing.xs },
  greeting: { color: colors.brand },
  weekSection: { gap: spacing.sm },
  sectionHeading: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  weekLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.round,
  },
  weekLinkPressed: { backgroundColor: colors.brandSoft },
  weekLinkText: { color: colors.brand, fontWeight: '600' },
  restDay: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  restCopy: { flex: 1, gap: spacing.xs },
  list: { gap: spacing.lg },
  card: { gap: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardCopy: { flex: 1, gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
