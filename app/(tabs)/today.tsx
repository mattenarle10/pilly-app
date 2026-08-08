import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import type { ScheduledDose } from '@/data/repositories';
import {
  PillyBanner,
  PillyCard,
  PillyIconButton,
  PillyIconTile,
  PillyModal,
  PillyText,
  Screen,
  WeekStatusStrip,
} from '@/design/components';
import { PillyIcon } from '@/design/icons';
import { colors, radii, spacing } from '@/design/tokens';
import { useDoseActions } from '@/hooks';
import {
  buildOrganizerDays,
  greetingFor,
  TodayDoseCard,
  TodayStarter,
  useTodayData,
} from '@/today';

export default function Today() {
  const { repository, today, dates, doses, weekDoses, medicines, reminderNotice, firstName } =
    useTodayData();
  const { mutation, recentDose, recordDose, undoRecent } = useDoseActions();
  const [correction, setCorrection] = useState<ScheduledDose | null>(null);
  const organizerDays = buildOrganizerDays(dates, weekDoses.data);
  const nextScheduledDay = organizerDays.slice(1).find((day) => day.state !== 'empty');

  const correctDose = () => {
    if (!correction) return;
    recordDose(correction, 'notRecorded');
    setCorrection(null);
  };

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <PillyText role="label" style={styles.greeting}>
            {greetingFor(today, firstName)}
          </PillyText>
          <PillyText role="large-title" accessibilityRole="header">
            Today
          </PillyText>
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
      {doses.isLoading ? <PillyBanner message="Loading today…" /> : null}
      {doses.isError ? (
        <PillyBanner
          kind="error"
          title="Couldn’t load today"
          message="Your data is still on this iPhone."
          actionLabel="Try again"
          onAction={() => void doses.refetch()}
        />
      ) : null}
      {medicines.isError ? (
        <PillyBanner kind="error" message="Couldn’t check your medicines." compact />
      ) : null}
      {mutation.isError ? (
        <PillyBanner kind="error" title="Change not saved" message="Try that action again." />
      ) : null}
      {recentDose ? (
        <PillyBanner
          kind="success"
          title="Recorded"
          message="You can undo this change."
          actionLabel="Undo"
          onAction={undoRecent}
          compact
        />
      ) : null}
      {doses.data?.length === 0 && medicines.data?.length === 0 ? (
        <TodayStarter onPress={() => router.push('/medicine/new')} />
      ) : null}
      {doses.data?.length === 0 && medicines.data && medicines.data.length > 0 ? (
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
        {doses.data?.map((dose) => (
          <TodayDoseCard
            key={dose.occurrenceId}
            dose={dose}
            busy={mutation.isPending}
            onRecord={(status) => recordDose(dose, status)}
            onCorrect={() => setCorrection(dose)}
          />
        ))}
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
});
