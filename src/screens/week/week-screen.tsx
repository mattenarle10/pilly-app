import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { PillyText, Screen, StatusLabel } from '@/design/components';
import { WeeklyOrganizer, type OrganizerDay } from '@/design/illustrations';
import { colors, spacing } from '@/design/tokens';
import { formatTime, toLocalDate, weekStartingToday } from '@/domain/schedule';
import { useRepository } from '@/providers';

const labels = { notRecorded: 'Not yet', taken: 'Taken', skipped: 'Skipped' } as const;

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
      <PillyText role="large-title">This week</PillyText>
      <PillyText muted>Choose a day to see what is expected.</PillyText>
      <WeeklyOrganizer
        days={organizerDays}
        selectedIndex={selectedIndex}
        presentation="week"
        height={168}
        onDayPress={setSelectedIndex}
      />
      <View accessibilityRole="tablist" style={styles.days}>
        {dates.map((date, index) => (
          <Pressable
            key={toLocalDate(date)}
            accessibilityRole="tab"
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
      {selectedDoses.length === 0 ? (
        <View style={styles.empty}>
          <PillyText role="headline">No doses scheduled.</PillyText>
        </View>
      ) : (
        <View style={styles.list}>
          {selectedDoses.map((dose) => (
            <View key={dose.occurrenceId} style={styles.row}>
              <View style={styles.copy}>
                <PillyText role="headline">{dose.medication.name}</PillyText>
                <PillyText muted>{formatTime(dose.schedule.hour, dose.schedule.minute)}</PillyText>
              </View>
              <StatusLabel label={labels[dose.status]} />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xxl,
  },
  day: {
    minWidth: 44,
    minHeight: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  daySelected: { backgroundColor: colors.brandSoft },
  list: { gap: spacing.md, marginTop: spacing.lg },
  row: {
    minHeight: 76,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copy: { flex: 1 },
  empty: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
});
