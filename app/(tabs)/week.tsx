import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  EmptyState,
  PillyBanner,
  PillyCard,
  PillyText,
  Screen,
  WeekStatusStrip,
} from '@/ui/components';
import { WeekEmptyCompanion } from '@/ui/illustrations';
import { colors, radii, spacing } from '@/ui/tokens';
import { useCurrentMinute, useWeekData } from '@/hooks';
import {
  buildWeekDays,
  groupWeekDoses,
  resolveWeekSelection,
  WeekAgenda,
  weekProgress,
  weekProgressMessage,
} from '@/features/week';

export default function WeekRoute() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { dates, doses, medicines } = useWeekData();
  const now = useCurrentMinute();
  const selectedIndex = resolveWeekSelection(dates, date);

  const days = buildWeekDays(dates, doses.data, now);
  const progress = weekProgress(doses.data, now);
  const selectedDate = dates[selectedIndex] ?? dates[0]!;
  const selectedDoses = doses.data?.[selectedIndex] ?? [];
  const groups = groupWeekDoses(selectedDoses);
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
        onDayPress={(index) => router.setParams({ date: days[index]?.key })}
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
              groups={groups}
              onOpenMedicine={(medicineId) =>
                router.push({ pathname: '/medicine/[id]', params: { id: medicineId } })
              }
            />
          )}
        </View>
      ) : null}
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
