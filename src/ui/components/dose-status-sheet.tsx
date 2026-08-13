import { Pressable, StyleSheet, View } from 'react-native';

import type { DoseStatus, ScheduledDose } from '@/models/dose';
import { PillySheet } from './pilly-sheet';
import { PillyText } from './pilly-text';
import { doseStatusVisuals } from './status-label';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, spacing } from '@/ui/tokens';
import { formatTime } from '@/models/schedule';

const options = ['taken', 'skipped', 'notRecorded'] as const satisfies readonly DoseStatus[];

export function DoseStatusSheet({
  dose,
  visible,
  busy,
  onSelect,
  onClose,
}: {
  dose: ScheduledDose | null;
  visible: boolean;
  busy: boolean;
  onSelect: (status: DoseStatus) => void;
  onClose: () => void;
}) {
  if (!dose) return null;
  return (
    <PillySheet
      visible={visible}
      title="Change record"
      message={`${dose.medication.name}, ${formatTime(dose.schedule.hour, dose.schedule.minute)}`}
      onClose={onClose}
    >
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((status) => {
          const visual = doseStatusVisuals[status];
          const selected = dose.status === status;
          return (
            <Pressable
              key={status}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: busy }}
              disabled={busy}
              onPress={() => onSelect(status)}
              style={({ pressed }) => [
                styles.option,
                selected && { backgroundColor: visual.background },
                pressed && styles.pressed,
              ]}
            >
              <PillyIcon name={visual.icon} size={21} color={visual.color} />
              <PillyText role="label" style={[styles.label, { color: visual.color }]}>
                {visual.label}
              </PillyText>
              {selected ? <PillyIcon name="done" size={20} color={visual.color} /> : null}
            </Pressable>
          );
        })}
      </View>
    </PillySheet>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.sm },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
  },
  label: { flex: 1 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
