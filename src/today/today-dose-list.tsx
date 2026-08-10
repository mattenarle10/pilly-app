import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import type { ScheduledDose } from '@/data/repositories';
import {
  MedicationAppearance,
  PillyButton,
  PillyCard,
  PillyIconButton,
  PillyText,
  StatusLabel,
} from '@/design/components';
import { colors, radii, spacing } from '@/design/tokens';
import { estimatedDaysLeft } from '@/domain/supply';
import type { DoseActionStatus } from '@/hooks';
import { isDoseAvailable, type TodayDoseGroup } from '@/today/today-state';

export function TodayDoseList({
  groups,
  now,
  busy,
  pendingOccurrenceId,
  onRecord,
  onCorrect,
  onOpenMedicine,
}: {
  groups: TodayDoseGroup[];
  now: Date;
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
                  now={now}
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
  now,
  busy,
  loading,
  onRecord,
  onCorrect,
  onOpen,
}: {
  dose: ScheduledDose;
  now: Date;
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
  const available = isDoseAvailable(dose, now);

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
        <MedicationAppearance
          shape={dose.medication.appearanceShape}
          size={dose.medication.appearanceSize}
          tone={dose.medication.appearanceTone}
          secondaryTone={dose.medication.appearanceSecondaryTone}
          display="mini"
        />
        <PillyText role="headline" numberOfLines={2} style={styles.medicineName}>
          {dose.medication.name}
        </PillyText>
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
        style={[
          styles.footer,
          dose.status === 'notRecorded' && !available && styles.upcomingFooter,
        ]}
      >
        {dose.status === 'notRecorded' ? (
          available ? (
            <View style={styles.actions}>
              <PillyButton
                label="Taken"
                icon="done"
                size="compact"
                loading={loading}
                disabled={busy && !loading}
                onPress={() => onRecord('taken')}
                style={styles.takeAction}
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
            <PillyText role="caption" muted>
              Later today
            </PillyText>
          )
        ) : (
          <>
            <View style={styles.metadata}>
              <StatusLabel status={dose.status} />
              {daysLeft !== null ? (
                <PillyText role="caption" muted>
                  About {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </PillyText>
              ) : null}
            </View>
            <PillyIconButton
              icon="edit"
              label={`Change status for ${dose.medication.name}`}
              disabled={busy}
              onPress={onCorrect}
              style={styles.skip}
            />
          </>
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
  upcomingFooter: { minHeight: 24 },
  metadata: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  takeAction: { flex: 1 },
  skip: { borderRadius: radii.round, backgroundColor: colors.surfaceSubtle },
});
