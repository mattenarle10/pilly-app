import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/ui/components/empty-state';
import { DoseTimeSheet } from '@/ui/components/dose-time-sheet';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyCard } from '@/ui/components/pilly-card';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { WeekAgenda } from '@/ui/components/week-agenda';
import { WeekStatusStrip } from '@/ui/components/week-status-strip';
import { WeekEmptyCompanion } from '@/ui/illustrations';
import { colors, radii, spacing } from '@/ui/tokens';
import { useCurrentMinute } from '@/hooks/use-current-minute';
import { useWeekData } from '@/hooks/use-week-data';
import {
  buildWeekDays,
  resolveWeekSelection,
  weekProgress,
  weekProgressMessage,
} from '@/models/week';
import { buildDoseTimePacks } from '@/models/dose-time-pack';

export default function WeekRoute() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { dates, doses, medicines } = useWeekData();
  const now = useCurrentMinute();
  const [selectedPackKey, setSelectedPackKey] = useState<string | null>(null);
  const selectedIndex = resolveWeekSelection(dates, date);

  const days = buildWeekDays(dates, doses.data, now);
  const progress = weekProgress(doses.data, now);
  const selectedDate = dates[selectedIndex] ?? dates[0]!;
  const selectedDoses = doses.data?.[selectedIndex] ?? [];
  const packs = buildDoseTimePacks(selectedDoses, now, false);
  const selectedPack = packs.find((pack) => pack.key === selectedPackKey) ?? null;
  const loading = (doses.isLoading && !doses.data) || (medicines.isLoading && !medicines.data);
  const failed = (doses.isError && !doses.data) || (medicines.isError && !medicines.data);
  const selectedLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(selectedDate);

  return (
    <Screen safeAreaEdges={['top']} contentStyle={styles.screen}>
      <View style={styles.heading}>
        <PillyText role="large-title" accessibilityRole="header">
          Week
        </PillyText>
        <PillyText role="caption" muted>
          {loading ? 'Loading your next 7 days…' : weekProgressMessage(progress)}
        </PillyText>
      </View>

      <WeekStatusStrip
        days={days}
        selectedIndex={selectedIndex}
        onDayPress={(index) => {
          setSelectedPackKey(null);
          router.setParams({ date: days[index]?.key });
        }}
      />

      {failed ? (
        <PillyBanner
          kind="error"
          title="Couldn’t load this week"
          message="Your saved data is still on this iPhone."
          actionLabel="Try again"
          onAction={() => {
            void doses.refetch();
            void medicines.refetch();
          }}
        />
      ) : null}

      {!failed && loading ? (
        <PillyCard tone="lavender" padding="medium" style={styles.loadingState}>
          <ActivityIndicator color={colors.brand} />
          <PillyText role="caption" muted>
            Loading schedule…
          </PillyText>
        </PillyCard>
      ) : null}

      {!failed && !loading && progress.total === 0 ? (
        <EmptyState
          illustration={
            <WeekEmptyCompanion variant={medicines.data?.length === 0 ? 'starter' : 'quiet'} />
          }
          title={medicines.data?.length === 0 ? 'Your week starts with a medicine' : 'A quiet week'}
          message={
            medicines.data?.length === 0
              ? 'Add one from the label in front of you.'
              : 'Nothing is scheduled in the next 7 days.'
          }
          actionLabel={medicines.data?.length === 0 ? 'Add medicine' : 'View medicines'}
          onAction={() =>
            router.push(medicines.data?.length === 0 ? '/medicine/new' : '/(tabs)/medicines')
          }
        />
      ) : null}

      {!failed && !loading && progress.total > 0 ? (
        <View style={styles.agendaSection}>
          <View style={styles.agendaHeading}>
            <PillyText role="title" style={styles.dateTitle}>
              {selectedLabel}
            </PillyText>
            <PillyText role="caption" muted>
              {selectedDoses.length === 0
                ? 'Rest day'
                : `${selectedDoses.length} ${selectedDoses.length === 1 ? 'dose' : 'doses'}`}
            </PillyText>
          </View>
          {selectedDoses.length === 0 ? (
            <View style={styles.restDay}>
              <PillyText role="headline">Nothing scheduled</PillyText>
              <PillyText role="caption" muted>
                Choose another day to see its medicines.
              </PillyText>
            </View>
          ) : (
            <WeekAgenda
              packs={packs}
              onOpenPack={(pack) => setSelectedPackKey(pack.key)}
            />
          )}
        </View>
      ) : null}
      <DoseTimeSheet
        pack={selectedPack}
        visible={selectedPack !== null}
        interactive={false}
        busy={false}
        onOpenMedicine={(dose) => {
          setSelectedPackKey(null);
          router.push({ pathname: '/medicine/[id]', params: { id: dose.medication.id } });
        }}
        onClose={() => setSelectedPackKey(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  heading: { gap: spacing.xs },
  loadingState: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  agendaSection: { gap: spacing.md },
  agendaHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  dateTitle: { flexShrink: 1 },
  restDay: {
    minHeight: 112,
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
  },
});
