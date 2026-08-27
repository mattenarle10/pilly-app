import { StyleSheet, View } from 'react-native';
import { ColorPicker, Host } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';

import { colors } from '@/ui/tokens';
import {
  medicationAppearanceColorSchema,
  normalizeMedicationAppearanceColor,
  type MedicationAppearanceColor,
} from '@/models/medication';

type Props = {
  label: string;
  value: MedicationAppearanceColor;
  onChange: (value: MedicationAppearanceColor) => void;
};

export function MedicationColorPicker({ label, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Host style={styles.host}>
        <ColorPicker
          label={label}
          selection={value}
          supportsOpacity={false}
          modifiers={[font({ size: 15, weight: 'regular' }), foregroundStyle(colors.textPrimary)]}
          onSelectionChange={(next) => {
            if (medicationAppearanceColorSchema.safeParse(next).success) {
              onChange(normalizeMedicationAppearanceColor(next));
            }
          }}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', minHeight: 44 },
  host: { flex: 1 },
});
