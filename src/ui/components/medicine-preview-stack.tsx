import { StyleSheet, View } from 'react-native';

import type { MedicineRecognitionPreview } from '@/models/dose-time-pack';
import { colors, radii, spacing } from '@/ui/tokens';
import { MedicationAppearance } from './medication-appearance';
import { PillyText } from './pilly-text';

export function MedicinePreviewStack({
  previews,
  overflowCount,
}: {
  previews: readonly MedicineRecognitionPreview[];
  overflowCount: number;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.row}
    >
      <View style={styles.stack}>
        {previews.map((preview, index) => (
          <View
            key={`${preview.id}:${index}`}
            style={[styles.preview, index > 0 && styles.overlap]}
          >
            <MedicationAppearance
              shape={preview.shape}
              size={preview.size}
              color={preview.color}
              secondaryColor={preview.secondaryColor}
              display="mini"
            />
          </View>
        ))}
      </View>
      {overflowCount > 0 ? (
        <PillyText role="caption" style={styles.overflow}>
          +{overflowCount}
        </PillyText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  preview: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
  },
  overlap: { marginLeft: -spacing.sm },
  overflow: {
    minWidth: 30,
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
