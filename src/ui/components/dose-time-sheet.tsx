import { Pressable, StyleSheet, View } from 'react-native';

import type { DoseStatus, ScheduledDose } from '@/models/dose';
import type { DoseTimePackModel } from '@/models/dose-time-pack';
import { colors, radii, spacing } from '@/ui/tokens';
import { MedicationAppearance } from './medication-appearance';
import { PillyButton } from './pilly-button';
import { PillyIconButton } from './pilly-icon-button';
import { PillySheet } from './pilly-sheet';
import { PillyText } from './pilly-text';
import { StatusLabel } from './status-label';

export function DoseTimeSheet({
  pack,
  visible,
  interactive,
  busy,
  pendingOccurrenceId,
  onRecord,
  onCorrect,
  onOpenMedicine,
  onClose,
}: {
  pack: DoseTimePackModel | null;
  visible: boolean;
  interactive: boolean;
  busy: boolean;
  pendingOccurrenceId?: string;
  onRecord?: (dose: ScheduledDose, status: Exclude<DoseStatus, 'notRecorded'>) => void;
  onCorrect?: (dose: ScheduledDose) => void;
  onOpenMedicine: (dose: ScheduledDose) => void;
  onClose: () => void;
}) {
  if (!pack) return null;
  const recorded = pack.total - pack.unresolved;
  const unresolved = pack.doses.filter((dose) => dose.status === 'notRecorded');
  const skipped = pack.doses.filter((dose) => dose.status === 'skipped');
  const taken = pack.doses.filter((dose) => dose.status === 'taken');

  return (
    <PillySheet
      visible={visible}
      title={pack.time}
      message={`${recorded} of ${pack.total} recorded`}
      dismissible={!busy}
      onClose={onClose}
    >
      <View style={styles.list}>
        {[...unresolved, ...skipped, ...taken].map((dose, index) => (
          <View key={dose.occurrenceId}>
            {index > 0 ? <View style={styles.separator} /> : null}
            <SheetDoseRow
              dose={dose}
              interactive={interactive}
              actionable={pack.actionable}
              busy={busy}
              loading={busy && pendingOccurrenceId === dose.occurrenceId}
              onRecord={(status) => onRecord?.(dose, status)}
              onCorrect={() => onCorrect?.(dose)}
              onOpen={() => onOpenMedicine(dose)}
            />
          </View>
        ))}
      </View>
    </PillySheet>
  );
}

function SheetDoseRow({
  dose,
  interactive,
  actionable,
  busy,
  loading,
  onRecord,
  onCorrect,
  onOpen,
}: {
  dose: ScheduledDose;
  interactive: boolean;
  actionable: boolean;
  busy: boolean;
  loading: boolean;
  onRecord: (status: Exclude<DoseStatus, 'notRecorded'>) => void;
  onCorrect: () => void;
  onOpen: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${dose.medication.name}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
      >
        <MedicationAppearance
          shape={dose.medication.appearanceShape}
          size={dose.medication.appearanceSize}
          color={dose.medication.appearanceColor}
          secondaryColor={dose.medication.appearanceSecondaryColor}
          display="mini"
        />
        <View style={styles.copy}>
          <PillyText role="headline">{dose.medication.name}</PillyText>
          {dose.medication.instructions ? (
            <PillyText role="caption" muted>
              {dose.medication.instructions}
            </PillyText>
          ) : null}
        </View>
      </Pressable>
      {dose.status === 'notRecorded' ? (
        interactive && actionable ? (
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
            {interactive ? 'Later today' : 'Not recorded'}
          </PillyText>
        )
      ) : (
        <View style={styles.recorded}>
          <StatusLabel status={dose.status} />
          {interactive ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Change status for ${dose.medication.name}`}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={onCorrect}
              style={({ pressed }) => [styles.change, pressed && styles.pressed]}
            >
              <PillyText role="caption" muted>
                Change
              </PillyText>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
  identity: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copy: { flex: 1, gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  takeAction: { flex: 1 },
  skip: { borderRadius: radii.round, backgroundColor: colors.surfaceSubtle },
  recorded: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  change: { minWidth: 60, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  separator: { height: 1, backgroundColor: colors.surfaceSubtle },
  pressed: { opacity: 0.65 },
});
