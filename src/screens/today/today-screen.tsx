import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { PillyButton, PillyText, Screen, StatusLabel } from '@/design/components';
import { WeeklyOrganizer, type OrganizerDay } from '@/design/illustrations';
import { colors, spacing } from '@/design/tokens';
import { formatTime, toLocalDate, weekStartingToday } from '@/domain/schedule';
import { estimatedDaysLeft } from '@/domain/supply';
import { useRepository } from '@/providers';
import type { ScheduledDose } from '@/data/repositories';

const statusCopy = { notRecorded: 'Not yet', taken: 'Taken', skipped: 'Skipped' } as const;
const countBits = (value: number) =>
  value
    .toString(2)
    .split('')
    .filter((bit) => bit === '1').length;

export function TodayScreen() {
  const repository = useRepository();
  const queryClient = useQueryClient();
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled-doses'] }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['organizer-week'] }),
  });
  const organizerDays: OrganizerDay[] = dates.map((date, index) => {
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
      state,
    };
  });

  return (
    <Screen>
      <View style={styles.titleRow}>
        <View>
          <PillyText role="large-title">Today</PillyText>
          <PillyText muted>
            {new Intl.DateTimeFormat(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(today)}
          </PillyText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add medicine"
          onPress={() => router.push('/medicine/new')}
          style={styles.add}
        >
          <PillyText role="title" style={styles.addText}>
            +
          </PillyText>
        </Pressable>
      </View>
      <WeeklyOrganizer days={organizerDays} selectedIndex={0} presentation="today" height={168} />
      {query.isLoading ? (
        <PillyText accessibilityLiveRegion="polite">Loading today…</PillyText>
      ) : null}
      {query.isError ? (
        <View style={styles.message}>
          <PillyText role="headline">Today could not be loaded.</PillyText>
          <PillyButton label="Try again" variant="secondary" onPress={() => void query.refetch()} />
        </View>
      ) : null}
      {query.data?.length === 0 ? (
        <View style={styles.message}>
          <PillyText role="headline">Nothing is scheduled today.</PillyText>
          <PillyText muted>Add a medicine to see its next dose here.</PillyText>
          <PillyButton label="Add medicine" onPress={() => router.push('/medicine/new')} />
        </View>
      ) : null}
      <View style={styles.list}>
        {query.data?.map((dose) => {
          const daysLeft = estimatedDaysLeft(
            dose.medication.supplyCount,
            countBits(dose.schedule.weekdayMask),
          );
          return (
            <View key={dose.occurrenceId} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardCopy}>
                  <PillyText role="headline">{dose.medication.name}</PillyText>
                  <PillyText>
                    {formatTime(dose.schedule.hour, dose.schedule.minute)}
                    {dose.medication.instructions ? ` · ${dose.medication.instructions}` : ''}
                  </PillyText>
                </View>
                <StatusLabel label={statusCopy[dose.status]} />
              </View>
              {daysLeft !== null ? (
                <PillyText role="caption" muted>
                  Supply may last about {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
                </PillyText>
              ) : null}
              {dose.status === 'notRecorded' ? (
                <View style={styles.actions}>
                  <PillyButton
                    label="Taken"
                    onPress={() => mutation.mutate({ dose, status: 'taken' })}
                    style={styles.action}
                  />
                  <PillyButton
                    label="Skipped"
                    variant="secondary"
                    onPress={() => mutation.mutate({ dose, status: 'skipped' })}
                    style={styles.action}
                  />
                </View>
              ) : (
                <PillyButton
                  label="Correct this record"
                  variant="secondary"
                  onPress={() => mutation.mutate({ dose, status: 'notRecorded' })}
                />
              )}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
  },
  add: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: colors.surface },
  message: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  list: { gap: spacing.lg },
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  cardCopy: { flex: 1, gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
