import { StyleSheet, View } from 'react-native';

import { colors, shadows } from '@/design/tokens';
import type {
  MedicationAppearanceShape,
  MedicationAppearanceSize,
  MedicationAppearanceTone,
} from '@/domain/medication';

type Props = {
  shape: MedicationAppearanceShape;
  size: MedicationAppearanceSize;
  tone: MedicationAppearanceTone;
  secondaryTone?: MedicationAppearanceTone;
  display?: 'mini' | 'compact' | 'hero';
};

const dimensions: Record<MedicationAppearanceShape, { width: number; height: number }> = {
  round: { width: 54, height: 54 },
  oval: { width: 78, height: 46 },
  capsule: { width: 84, height: 38 },
};

const sizeScale: Record<MedicationAppearanceSize, number> = {
  small: 0.78,
  medium: 0.9,
  large: 1,
};

const toneColor: Record<MedicationAppearanceTone, string> = {
  rose: colors.brandSoft,
  peach: colors.peachSoft,
  lavender: colors.lavenderSoft,
  neutral: colors.surfaceSubtle,
};

export function medicationAppearanceLabel(
  shape: MedicationAppearanceShape,
  size: MedicationAppearanceSize,
  tone: MedicationAppearanceTone,
): string {
  return `${size} ${tone} ${shape}`;
}

export function MedicationAppearance({
  shape,
  size,
  tone,
  secondaryTone = tone,
  display = 'hero',
}: Props) {
  const displayScale = display === 'mini' ? 0.5 : display === 'compact' ? 0.72 : 1;
  const scale = sizeScale[size] * displayScale;
  const width = dimensions[shape].width * scale;
  const height = dimensions[shape].height * scale;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.frame,
        display === 'compact' && styles.compactFrame,
        display === 'mini' && styles.miniFrame,
      ]}
    >
      <View style={[styles.shadow, { width, height, borderRadius: height / 2 }]}>
        <View
          testID="pill-body"
          style={[
            styles.pill,
            { width, height, borderRadius: height / 2, backgroundColor: toneColor[tone] },
          ]}
        >
          {shape === 'capsule' ? (
            <View
              testID="pill-second-half"
              style={[styles.capsuleHalf, { backgroundColor: toneColor[secondaryTone] }]}
            />
          ) : null}
          <View
            style={[
              styles.score,
              shape === 'capsule'
                ? { width: 1, height: '100%' }
                : { width: Math.max(14, width * 0.34), height: 1 },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 104,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactFrame: { width: 72, height: 52 },
  miniFrame: { width: 44, height: 34 },
  shadow: { ...shadows.soft },
  pill: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleHalf: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '50%',
  },
  score: { backgroundColor: 'rgba(43, 35, 39, 0.22)' },
});
