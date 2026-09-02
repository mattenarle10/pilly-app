import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutRight, ReduceMotion } from 'react-native-reanimated';

import type { ScheduledDose } from '@/models/dose';
import { DoseStatusSheet } from '@/ui/components/dose-status-sheet';
import { DoseTimeSheet } from '@/ui/components/dose-time-sheet';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyCard } from '@/ui/components/pilly-card';
import { PillyIconButton } from '@/ui/components/pilly-icon-button';
import { PillyText } from '@/ui/components/pilly-text';
import { PillyToast } from '@/ui/components/pilly-toast';
import { Screen } from '@/ui/components/screen';
import { TodayDoseList } from '@/ui/components/today-dose-list';
import { TodayStarter } from '@/ui/components/today-starter';
import { WeekStatusStrip } from '@/ui/components/week-status-strip';
import { TodayCompanion } from '@/ui/illustrations';
import { colors, radii, spacing } from '@/ui/tokens';
import { useCurrentMinute } from '@/hooks/use-current-minute';
import { useAccountSession } from '@/hooks/use-account-session';
import { useDoseActions } from '@/hooks/use-dose-actions';
import { useTodayData } from '@/hooks/use-today-data';
import { useProfileAvatar } from '@/hooks/use-profile-avatar';
import { PillyAvatar } from '@/ui/components/pilly-avatar';
import {
  buildOrganizerDays,
  greetingFor,
  todayProgress,
  todayProgressDetail,
  todayProgressHeadline,
} from '@/models/today';
import { buildDoseTimePacks } from '@/models/dose-time-pack';

export default function Today() {
  const account = useAccountSession();
  const avatar = useProfileAvatar();
  const { repository, today, dates, doses, weekDoses, medicines, reminderNotice, firstName } =
    useTodayData();
  const now = useCurrentMinute();
  const { mutation, recentAction, recordDose, undoRecent } = useDoseActions();
  const [correction, setCorrection] = useState<ScheduledDose | null>(null);
  const [correctionVisible, setCorrectionVisible] = useState(false);
  const [selectedPackKey, setSelectedPackKey] = useState<string | null>(null);
  const organizerDays = buildOrganizerDays(dates, weekDoses.data, today);
  const dosePacks = buildDoseTimePacks(doses.data, now, true);
  const selectedPack = dosePacks.find((pack) => pack.key === selectedPackKey) ?? null;
  const progress = todayProgress(doses.data, now);
  const nextScheduledDay = organizerDays.slice(1).find((day) => day.state !== 'empty');

  const correctDose = (status: ScheduledDose['status']) => {
    if (!correction) return;
    if (status !== correction.status) recordDose(correction, status);
    setCorrectionVisible(false);
  };

  return (
    <Screen
      safeAreaEdges={['top']}
      contentStyle={styles.screen}
      overlay={
        recentAction ? (
          <Animated.View
            entering={FadeInRight.duration(180).reduceMotion(ReduceMotion.System)}
            exiting={FadeOutRight.duration(160).reduceMotion(ReduceMotion.System)}
          >
            <PillyToast
              tone={recentAction.status === 'taken' ? 'brand' : 'warning'}
              message={recentAction.status === 'taken' ? 'Taken' : 'Skipped'}
              actionLabel="Undo"
              onAction={undoRecent}
              actionDisabled={mutation.isPending}
            />
          </Animated.View>
        ) : undefined
      }
    >
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <PillyText role="caption" numberOfLines={1} style={styles.greeting}>
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
        {account.state.kind === 'signed-in' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            hitSlop={6}
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [styles.profileButton, pressed && styles.profilePressed]}
          >
            <PillyAvatar
              displayName={firstName || account.state.user.displayName}
              uri={avatar.uri}
              plus={avatar.plusActive}
              size={40}
            />
          </Pressable>
        ) : (
          <PillyIconButton icon="profile" label="Profile" onPress={() => router.push('/profile')} />
        )}
      </View>
      {progress.total > 0 ? (
        <View
          style={[styles.summary, progress.recorded === progress.total && styles.completedSummary]}
        >
          <TodayCompanion recorded={progress.recorded} total={progress.total} size="compact" />
          <View style={styles.summaryCopy}>
            <PillyText role="title">{todayProgressHeadline(progress)}</PillyText>
            <PillyText role="caption" muted>
              {todayProgressDetail(progress)}
            </PillyText>
          </View>
        </View>
      ) : null}
      <View style={styles.weekSection}>
        <PillyText role="headline">This week</PillyText>
        <WeekStatusStrip
          days={organizerDays}
          variant="compact"
          onDayPress={(index) =>
            router.push({
              pathname: '/(tabs)/week',
              params: { date: organizerDays[index]?.key ?? organizerDays[0]?.key },
            })
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
      {doses.data?.length === 0 && medicines.data?.length === 0 ? (
        <TodayStarter onPress={() => router.push('/medicine/new')} />
      ) : null}
      {doses.data?.length === 0 && medicines.data && medicines.data.length > 0 ? (
        <PillyCard tone="peach" padding="medium" style={styles.restDay}>
          <TodayCompanion recorded={0} total={0} />
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
      <TodayDoseList
        packs={dosePacks}
        now={now}
        busy={mutation.isPending}
        pendingOccurrenceId={mutation.variables?.dose.occurrenceId}
        onRecord={recordDose}
        onCorrect={(dose) => {
          setSelectedPackKey(null);
          setCorrection(dose);
          setCorrectionVisible(true);
        }}
        onOpenMedicine={(dose) =>
          router.push({ pathname: '/medicine/[id]', params: { id: dose.medication.id } })
        }
        onOpenPack={(pack) => setSelectedPackKey(pack.key)}
      />
      <DoseTimeSheet
        pack={selectedPack}
        visible={selectedPack !== null}
        interactive
        busy={mutation.isPending}
        pendingOccurrenceId={mutation.variables?.dose.occurrenceId}
        onRecord={recordDose}
        onCorrect={(dose) => {
          setSelectedPackKey(null);
          setCorrection(dose);
          setCorrectionVisible(true);
        }}
        onOpenMedicine={(dose) => {
          setSelectedPackKey(null);
          router.push({ pathname: '/medicine/[id]', params: { id: dose.medication.id } });
        }}
        onClose={() => setSelectedPackKey(null)}
      />
      <DoseStatusSheet
        dose={correction}
        visible={correctionVisible}
        busy={mutation.isPending}
        onSelect={correctDose}
        onClose={() => setCorrectionVisible(false)}
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
  profileButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  profilePressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  greeting: { color: colors.brand, fontWeight: '600' },
  summary: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.lavenderSoft,
  },
  summaryCopy: { flex: 1, gap: spacing.xs },
  completedSummary: { backgroundColor: colors.successSoft },
  weekSection: { gap: spacing.sm },
  restDay: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  restCopy: { flex: 1, gap: spacing.xs },
});
