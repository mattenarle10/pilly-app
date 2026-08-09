import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import type { ScheduledDose } from '@/data/repositories';
import {
  PillyButton,
  PillyCard,
  PillyIconButton,
  PillyText,
  StatusLabel,
} from '@/design/components';
import { PillyIcon } from '@/design/icons';
import { colors, radii, spacing } from '@/design/tokens';
import { estimatedDaysLeft } from '@/domain/supply';
import type { DoseActionStatus } from '@/hooks';
import type { TodayDoseGroup } from '@/today/today-state';

export function TodayDoseList({
  groups,
  busy,
  pendingOccurrenceId,
  onRecord,
  onCorrect,
  onOpenMedicine,
}: {
  groups: TodayDoseGroup[];
  busy: boolean;
  pendingOccurrenceId?: string;
  onRecord: (dose: ScheduledDose, status: Exclude<DoseActionStatus, 'notRecorded'>) => void;
  onCorrect: (dose: ScheduledDose) => void;
  onOpenMedicine: (dose: ScheduledDose) => void;
}) {
  return (
    <View style={styles.list}>
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <PillyText role="label" style={styles.time}>
            {group.time}
          </PillyText>
          <PillyCard padding="medium" style={styles.groupCard}>
            {group.doses.map((dose, index) => (
              <View key={dose.occurrenceId}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <DoseRow
                  dose={dose}
                  busy={busy}
                  loading={busy && pendingOccurrenceId === dose.occurrenceId}
                  onRecord={(status) => onRecord(dose, status)}
                  onCorrect={() => onCorrect(dose)}
                  onOpen={() => onOpenMedicine(dose)}
                />
              </View>
            ))}
          </PillyCard>
        </View>
      ))}
    </View>
  );
}

function DoseRow({
  dose,
  busy,
  loading,
  onRecord,
  onCorrect,
  onOpen,
}: {
  dose: ScheduledDose;
  busy: boolean;
  loading: boolean;
  onRecord: (status: Exclude<DoseActionStatus, 'notRecorded'>) => void;
  onCorrect: () => void;
  onOpen: () => void;
}) {
  const daysLeft = estimatedDaysLeft(
    dose.medication.supplyCount,
    countDays(dose.schedule.weekdayMask),
  );

  return (
    <Animated.View
      layout={LinearTransition.duration(180).reduceMotion(ReduceMotion.System)}
      style={styles.row}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${dose.medication.name}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.medicineLink, pressed && styles.pressedLink]}
      >
        <PillyText role="headline" style={styles.medicineName}>
          {dose.medication.name}
        </PillyText>
        <PillyIcon name="next" size={17} color={colors.textSecondary} />
      </Pressable>
      {dose.medication.instructions ? (
        <PillyText role="caption" muted>
          {dose.medication.instructions}
        </PillyText>
      ) : null}
      {dose.status === 'notRecorded' && daysLeft !== null ? (
        <PillyText role="caption" muted>
          About {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
        </PillyText>
      ) : null}
      <Animated.View
        key={dose.status}
        entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(100).reduceMotion(ReduceMotion.System)}
        style={styles.footer}
      >
        <View style={styles.metadata}>
          <StatusLabel status={dose.status} />
          {dose.status !== 'notRecorded' && daysLeft !== null ? (
            <PillyText role="caption" muted>
              About {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
            </PillyText>
          ) : null}
        </View>
        {dose.status === 'notRecorded' ? (
          <View style={styles.actions}>
            <PillyButton
              label="Taken"
              icon="done"
              size="compact"
              loading={loading}
              disabled={busy && !loading}
              onPress={() => onRecord('taken')}
            />
            <PillyIconButton
              icon="remove"
              label={`Skip ${dose.medication.name}`}
              disabled={busy}
              onPress={() => onRecord('skipped')}
              style={styles.skip}
            />
          </View>
        ) : (
          <PillyIconButton
            icon="edit"
            label={`Change status for ${dose.medication.name}`}
            disabled={busy}
            onPress={onCorrect}
            style={styles.skip}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const countDays = (weekdayMask: number) =>
  weekdayMask
    .toString(2)
    .split('')
    .filter((bit) => bit === '1').length;

const styles = StyleSheet.create({
  list: { gap: spacing.xl },
  group: { gap: spacing.sm },
  time: { color: colors.brandStrong, paddingHorizontal: spacing.xs },
  groupCard: {
    gap: 0,
    backgroundColor: colors.surface,
    shadowOpacity: 0.04,
    elevation: 0,
  },
  separator: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.surfaceSubtle,
  },
  row: { gap: spacing.sm },
  medicineLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  medicineName: { flex: 1 },
  pressedLink: { opacity: 0.62 },
  footer: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metadata: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  skip: { borderRadius: radii.round, backgroundColor: colors.surfaceSubtle },
});
