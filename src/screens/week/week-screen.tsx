import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  EmptyState,
  PillyBanner,
  PillyCard,
  PillyText,
  Screen,
  StatusLabel,
  WeekStatusStrip,
} from '@/design/components';
import { spacing } from '@/design/tokens';
import { formatTime, toLocalDate, weekStartingToday } from '@/domain/schedule';
import { useRepository } from '@/hooks';

export function WeekScreen() {
  const repository = useRepository();
  const { day } = useLocalSearchParams<{ day?: string }>();
  const dates = useMemo(() => weekStartingToday(), []);
  const requestedDay = Number(day);
  const initialDay =
    Number.isInteger(requestedDay) && requestedDay >= 0 && requestedDay <= 6 ? requestedDay : 0;
  const [selectedIndex, setSelectedIndex] = useState(initialDay);
  const query = useQuery({
    queryKey: ['week', toLocalDate(dates[0]!)],
    queryFn: () => Promise.all(dates.map((date) => repository.listScheduledDoses(date))),
    networkMode: 'always',
  });
  const selectedDate = dates[selectedIndex]!;
  const selectedDoses = query.data?.[selectedIndex] ?? [];
  const organizerDays = dates.map((date, index) => {
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
      dateNumber: date.getDate(),
      state,
    } as const;
  });
  return (
    <Screen safeAreaEdges={['top']} contentStyle={styles.screen}>
      <View style={styles.heading}>
        <PillyText role="large-title">Week</PillyText>
        <PillyText role="caption" muted>
          Choose a day.
        </PillyText>
      </View>
      <WeekStatusStrip
        days={organizerDays}
        selectedIndex={selectedIndex}
        onDayPress={setSelectedIndex}
      />
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
        <EmptyState icon="calendarWeek" title="No doses scheduled" />
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
  screen: { gap: spacing.lg },
  heading: { gap: spacing.xs },
  list: { gap: spacing.md },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  copy: { flex: 1, gap: spacing.xs },
});
