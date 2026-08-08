import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import type { ScheduledDose } from '@/data/repositories';
import {
  EmptyState,
  PillyBanner,
  PillyButton,
  PillyCard,
  PillyIconButton,
  PillyModal,
  PillyText,
  Screen,
  StatusLabel,
} from '@/design/components';
import { WeeklyOrganizer, type OrganizerDay } from '@/design/illustrations';
import { spacing } from '@/design/tokens';
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
  const reminderNotice = useQuery({
    queryKey: ['settings', 'reminderNotice'],
    queryFn: () => repository.getSetting('reminderNotice'),
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
  const correctDose = () => {
    if (!correction) return;
    mutation.mutate({ dose: correction, status: 'notRecorded' });
    setCorrection(null);
  };

  return (
    <Screen>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <PillyText role="large-title">Today</PillyText>
          <PillyText role="caption" muted>
            {new Intl.DateTimeFormat(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(today)}
          </PillyText>
        </View>
        <View style={styles.headerActions}>
          <PillyIconButton
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push('/settings')}
          />
          <PillyIconButton
            icon="add"
            label="Add medicine"
            tone="brand"
            onPress={() => router.push('/medicine/new')}
          />
        </View>
      </View>
      <WeeklyOrganizer days={organizerDays} selectedIndex={0} presentation="today" height={154} />
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
      {query.data?.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Nothing due today"
          message="Add a medicine when you’re ready."
          actionLabel="Add medicine"
          onAction={() => router.push('/medicine/new')}
        />
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
                    icon="checkmark"
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
                  icon="create-outline"
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
  },
  titleCopy: { flex: 1, gap: spacing.xs },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  list: { gap: spacing.lg },
  card: { gap: spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardCopy: { flex: 1, gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
