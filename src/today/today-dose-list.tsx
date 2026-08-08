import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { ScheduledDose } from '@/data/repositories';
import {
  PillyButton,
  PillyCard,
  PillyIconButton,
  PillyText,
  StatusLabel,
} from '@/design/components';
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
}: {
  groups: TodayDoseGroup[];
  busy: boolean;
  pendingOccurrenceId?: string;
  onRecord: (dose: ScheduledDose, status: Exclude<DoseActionStatus, 'notRecorded'>) => void;
  onCorrect: (dose: ScheduledDose) => void;
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
}: {
  dose: ScheduledDose;
  busy: boolean;
  loading: boolean;
  onRecord: (status: Exclude<DoseActionStatus, 'notRecorded'>) => void;
  onCorrect: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const previousStatus = useRef(dose.status);
  const offset = useSharedValue(0);
  const daysLeft = estimatedDaysLeft(
    dose.medication.supplyCount,
    countDays(dose.schedule.weekdayMask),
  );

  useEffect(() => {
    if (previousStatus.current === dose.status) return;
    previousStatus.current = dose.status;
    if (reducedMotion || dose.status === 'notRecorded') {
      offset.value = 0;
      return;
    }
    const direction = dose.status === 'taken' ? spacing.sm : -spacing.sm;
    offset.value = withSequence(
      withTiming(direction, { duration: 90, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 170, easing: Easing.out(Easing.cubic) }),
    );
  }, [dose.status, offset, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <PillyText role="headline">{dose.medication.name}</PillyText>
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
      <View style={styles.footer}>
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
      </View>
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
  groupCard: { gap: 0 },
  separator: { height: 1, marginVertical: spacing.md, backgroundColor: colors.border },
  row: { gap: spacing.sm },
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
