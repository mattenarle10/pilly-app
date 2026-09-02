import { Pressable, StyleSheet, View } from 'react-native';

import type { DoseTimePackModel } from '@/models/dose-time-pack';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';
import { MedicinePreviewStack } from './medicine-preview-stack';
import { PillyText } from './pilly-text';

export function DoseTimePack({ pack, onPress }: { pack: DoseTimePackModel; onPress: () => void }) {
  const state = packStateCopy(pack);
  const recorded = pack.total - pack.unresolved;
  const takenWidth = `${(pack.taken / pack.total) * 100}%` as const;
  const skippedWidth = `${(pack.skipped / pack.total) * 100}%` as const;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pack.accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: pack.total,
        now: recorded,
        text: `${recorded} of ${pack.total} recorded`,
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pack,
        pack.focal && styles.focal,
        pack.state === 'complete' && styles.complete,
        pack.state === 'future' && styles.future,
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.progress}>
        <View
          testID={`dose-pack-taken-progress-${pack.key}`}
          style={[styles.progressTaken, { width: takenWidth }]}
        />
        <View
          testID={`dose-pack-skipped-progress-${pack.key}`}
          style={[styles.progressSkipped, { width: skippedWidth }]}
        />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <PillyText role={pack.focal ? 'title' : 'headline'} style={styles.time}>
            {pack.time}
          </PillyText>
          <View style={styles.stateCopy}>
            <View style={styles.stateHeadline}>
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
                {state.primary}
              </PillyText>
            </View>
            {state.secondary ? (
              <PillyText role="caption" muted style={styles.stateSecondary}>
                {state.secondary}
              </PillyText>
            ) : null}
          </View>
        </View>
        <MedicinePreviewStack previews={pack.previews} overflowCount={pack.overflowCount} />
      </View>
      <PillyIcon name="next" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

function packStateCopy(pack: DoseTimePackModel): { primary: string; secondary?: string } {
  const recorded = pack.total - pack.unresolved;
  if (pack.state === 'complete') {
    return pack.skipped > 0
      ? { primary: 'Recorded', secondary: `${pack.taken} taken, ${pack.skipped} skipped` }
      : { primary: 'Complete' };
  }
  if (pack.state === 'future') return { primary: 'Later' };
  if (pack.state === 'partial') {
    return { primary: `${pack.unresolved} due`, secondary: `${recorded} of ${pack.total} done` };
  }
  return { primary: `${pack.unresolved} due` };
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
    overflow: 'hidden',
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
  progress: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'row',
    opacity: 0.72,
  },
  progressTaken: { height: '100%', backgroundColor: colors.successSoft },
  progressSkipped: { height: '100%', backgroundColor: colors.surfaceSubtle },
  copy: { zIndex: 1, flex: 1, gap: spacing.xs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  time: { color: colors.textPrimary },
  stateCopy: { flexShrink: 1, alignItems: 'flex-end' },
  stateHeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  state: { color: colors.textSecondary, fontWeight: '600', textAlign: 'right' },
  stateSecondary: { textAlign: 'right' },
  focalState: { color: colors.brandStrong },
  completeState: { color: colors.success },
});
