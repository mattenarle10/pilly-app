import { Pressable, StyleSheet, View } from 'react-native';

import type { DoseTimePackModel } from '@/models/dose-time-pack';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';
import { MedicinePreviewStack } from './medicine-preview-stack';
import { PillyText } from './pilly-text';

export function DoseTimePack({
  pack,
  onPress,
}: {
  pack: DoseTimePackModel;
  onPress: () => void;
}) {
  const state = packStateCopy(pack);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pack.accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pack,
        pack.focal && styles.focal,
        pack.state === 'complete' && styles.complete,
        pack.state === 'future' && styles.future,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <PillyText role={pack.focal ? 'title' : 'headline'} style={styles.time}>
            {pack.time}
          </PillyText>
          <View style={styles.stateRow}>
            {pack.state === 'complete' ? (
              <PillyIcon name="success" size={18} color={colors.success} />
            ) : null}
            <PillyText
              role="caption"
              style={[
                styles.state,
                pack.focal && styles.focalState,
                pack.state === 'complete' && styles.completeState,
              ]}
            >
              {state}
            </PillyText>
          </View>
        </View>
        <MedicinePreviewStack previews={pack.previews} overflowCount={pack.overflowCount} />
      </View>
      <PillyIcon name="next" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

function packStateCopy(pack: DoseTimePackModel): string {
  if (pack.state === 'complete') return 'Complete';
  if (pack.state === 'future') return 'Later';
  if (pack.state === 'partial') {
    return `${pack.unresolved} due · ${pack.taken + pack.skipped} recorded`;
  }
  return `${pack.unresolved} due`;
}

const styles = StyleSheet.create({
  pack: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    ...shadows.soft,
  },
  focal: {
    minHeight: 104,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  complete: { minHeight: 76, backgroundColor: colors.successSoft },
  future: { backgroundColor: colors.surfaceSubtle, shadowOpacity: 0 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  copy: { flex: 1, gap: spacing.xs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  time: { color: colors.textPrimary },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  state: { color: colors.textSecondary, fontWeight: '600' },
  focalState: { color: colors.brandStrong },
  completeState: { color: colors.success },
});
