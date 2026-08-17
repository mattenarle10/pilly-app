import { StyleSheet } from 'react-native';
import { ColorPicker, Host } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';

import { colors } from '@/ui/tokens';
import {
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
    <Host matchContents style={styles.host}>
      <ColorPicker
        label={label}
        selection={value}
        supportsOpacity={false}
        modifiers={[font({ size: 15, weight: 'regular' }), foregroundStyle(colors.textPrimary)]}
        onSelectionChange={(next) => onChange(normalizeMedicationAppearanceColor(next))}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { minHeight: 44, justifyContent: 'center' },
});
