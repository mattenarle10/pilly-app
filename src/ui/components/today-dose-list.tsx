import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import type { DoseStatus, ScheduledDose } from '@/models/dose';
import { MedicineRecognition } from './medicine-recognition';
import { PillyButton } from './pilly-button';
import { PillyCard } from './pilly-card';
import { PillyText } from './pilly-text';
import { StatusLabel } from './status-label';
import { DoseTimePack } from './dose-time-pack';
import { colors, spacing } from '@/ui/tokens';
import type { DoseTimePackModel } from '@/models/dose-time-pack';
import { isDoseAvailable } from '@/models/today';

export function TodayDoseList({
  packs,
  now,
  busy,
  pendingOccurrenceId,
  pendingStatus,
  onRecord,
  onCorrect,
  onOpenMedicine,
  onOpenPack,
}: {
  packs: DoseTimePackModel[];
  now: Date;
  busy: boolean;
  pendingOccurrenceId?: string;
  pendingStatus?: DoseStatus;
  onRecord: (dose: ScheduledDose, status: Exclude<DoseStatus, 'notRecorded'>) => void;
  onCorrect: (dose: ScheduledDose) => void;
  onOpenMedicine: (dose: ScheduledDose) => void;
  onOpenPack: (pack: DoseTimePackModel) => void;
}) {
  return (
    <View style={styles.list}>
      {packs.map((pack) =>
        pack.doses.length === 1 ? (
          <View key={pack.key} style={styles.group}>
            <PillyText role="label" style={styles.time}>
              {pack.time}
            </PillyText>
            <PillyCard
              padding="medium"
              style={[styles.groupCard, pack.state === 'complete' && styles.completeCard]}
            >
              <DoseRow
                dose={pack.doses[0]!}
                now={now}
                busy={busy}
                loadingStatus={
                  busy && pendingOccurrenceId === pack.doses[0]!.occurrenceId
                    ? pendingStatus
                    : undefined
                }
                onRecord={(status) => onRecord(pack.doses[0]!, status)}
                onCorrect={() => onCorrect(pack.doses[0]!)}
                onOpen={() => onOpenMedicine(pack.doses[0]!)}
              />
            </PillyCard>
          </View>
        ) : (
          <DoseTimePack key={pack.key} pack={pack} onPress={() => onOpenPack(pack)} />
        ),
      )}
    </View>
  );
}

function DoseRow({
  dose,
  now,
  busy,
  loadingStatus,
  onRecord,
  onCorrect,
  onOpen,
}: {
  dose: ScheduledDose;
  now: Date;
  busy: boolean;
  loadingStatus?: DoseStatus;
  onRecord: (status: Exclude<DoseStatus, 'notRecorded'>) => void;
  onCorrect: () => void;
  onOpen: () => void;
}) {
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
        <MedicineRecognition
          form={dose.medication.form}
          tabletShape={dose.medication.tabletShape}
          size={dose.medication.appearanceSize}
          color={dose.medication.appearanceColor}
          secondaryColor={dose.medication.appearanceSecondaryColor}
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
                loading={loadingStatus === 'taken'}
                disabled={busy && loadingStatus !== 'taken'}
                onPress={() => onRecord('taken')}
                style={styles.takeAction}
              />
              <PillyButton
                icon="remove"
                label="Skip"
                variant="secondary"
                size="compact"
                loading={loadingStatus === 'skipped'}
                accessibilityLabel={`Skip ${dose.medication.name}`}
                disabled={busy && loadingStatus !== 'skipped'}
                onPress={() => onRecord('skipped')}
                style={styles.skipAction}
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
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Change status for ${dose.medication.name}`}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={onCorrect}
              style={({ pressed }) => [
                styles.correction,
                pressed && styles.correctionPressed,
                busy && styles.correctionDisabled,
              ]}
            >
              <PillyText role="caption" muted>
                Change
              </PillyText>
            </Pressable>
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
}

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
  completeCard: { backgroundColor: colors.successSoft, shadowOpacity: 0.02 },
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
  skipAction: { minWidth: 112 },
  correction: {
    minWidth: 60,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  correctionPressed: { opacity: 0.58 },
  correctionDisabled: { opacity: 0.35 },
});
