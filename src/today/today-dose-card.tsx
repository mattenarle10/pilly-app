import { StyleSheet, View } from 'react-native';

import type { ScheduledDose } from '@/data/repositories';
import { PillyButton, PillyCard, PillyText, StatusLabel } from '@/design/components';
import { spacing } from '@/design/tokens';
import { formatTime } from '@/domain/schedule';
import { estimatedDaysLeft } from '@/domain/supply';
import type { DoseActionStatus } from '@/hooks';

const countDays = (weekdayMask: number) =>
  weekdayMask
    .toString(2)
    .split('')
    .filter((bit) => bit === '1').length;

export function TodayDoseCard({
  dose,
  busy,
  onRecord,
  onCorrect,
}: {
  dose: ScheduledDose;
  busy: boolean;
  onRecord: (status: Exclude<DoseActionStatus, 'notRecorded'>) => void;
  onCorrect: () => void;
}) {
  const daysLeft = estimatedDaysLeft(
    dose.medication.supplyCount,
    countDays(dose.schedule.weekdayMask),
  );

  return (
    <PillyCard style={styles.card}>
      <View style={styles.top}>
        <View style={styles.copy}>
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
            loading={busy}
            onPress={() => onRecord('taken')}
            style={styles.action}
          />
          <PillyButton
            label="Skip"
            icon="remove"
            size="medium"
            variant="secondary"
            disabled={busy}
            onPress={() => onRecord('skipped')}
            style={styles.action}
          />
        </View>
      ) : (
        <PillyButton
          label="Change status"
          icon="edit"
          size="medium"
          variant="secondary"
          onPress={onCorrect}
          fullWidth
        />
      )}
    </PillyCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
