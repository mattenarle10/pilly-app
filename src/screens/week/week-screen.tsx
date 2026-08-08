import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import {
  EmptyState,
  PillyBanner,
  PillyCard,
  PillyText,
  Screen,
  StatusLabel,
} from '@/design/components';
import { WeeklyOrganizer, type OrganizerDay } from '@/design/illustrations';
import { colors, radii, spacing } from '@/design/tokens';
import { formatTime, toLocalDate, weekStartingToday } from '@/domain/schedule';
import { useRepository } from '@/providers';

export function WeekScreen() {
  const repository = useRepository();
  const dates = useMemo(() => weekStartingToday(), []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const query = useQuery({
    queryKey: ['week', toLocalDate(dates[0]!)],
    queryFn: () => Promise.all(dates.map((date) => repository.listScheduledDoses(date))),
    networkMode: 'always',
  });
  const organizerDays: OrganizerDay[] = dates.map((date, index) => {
    const doses = query.data?.[index] ?? [];
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
  const selectedDate = dates[selectedIndex]!;
  const selectedDoses = query.data?.[selectedIndex] ?? [];
  return (
    <Screen>
      <View style={styles.heading}>
        <PillyText role="large-title">Week</PillyText>
        <PillyText role="caption" muted>
          Tap a day.
        </PillyText>
      </View>
      <WeeklyOrganizer
        days={organizerDays}
        selectedIndex={selectedIndex}
        presentation="week"
        height={154}
        onDayPress={setSelectedIndex}
      />
      <View accessibilityRole="tablist" style={styles.days}>
        {dates.map((date, index) => (
          <Pressable
            key={toLocalDate(date)}
            accessibilityRole="tab"
            accessibilityLabel={new Intl.DateTimeFormat(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(date)}
            accessibilityState={{ selected: index === selectedIndex }}
            onPress={() => setSelectedIndex(index)}
            style={[styles.day, index === selectedIndex && styles.daySelected]}
          >
            <PillyText role="caption" muted={index !== selectedIndex}>
              {new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(date)}
            </PillyText>
            <PillyText role="headline">{date.getDate()}</PillyText>
          </Pressable>
        ))}
      </View>
      <PillyText role="title">
        {new Intl.DateTimeFormat(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }).format(selectedDate)}
      </PillyText>
      {query.isError ? (
        <PillyBanner
          kind="error"
          title="Couldn’t load this week"
          message="Try again in a moment."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {!query.isLoading && selectedDoses.length === 0 ? (
        <EmptyState icon="calendar-clear-outline" title="No doses scheduled" />
      ) : (
        <View style={styles.list}>
          {selectedDoses.map((dose) => (
            <PillyCard key={dose.occurrenceId} padding="medium" style={styles.row}>
              <View style={styles.copy}>
                <PillyText role="headline">{dose.medication.name}</PillyText>
                <PillyText role="caption" muted>
                  {formatTime(dose.schedule.hour, dose.schedule.minute)}
                </PillyText>
              </View>
              <StatusLabel status={dose.status} />
            </PillyCard>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xs },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xxl,
  },
  day: {
    minWidth: 44,
    minHeight: 58,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  daySelected: { backgroundColor: colors.brandSoft },
  list: { gap: spacing.md, marginTop: spacing.lg },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  copy: { flex: 1, gap: spacing.xs },
});
