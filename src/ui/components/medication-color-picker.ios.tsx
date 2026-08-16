import { StyleSheet } from 'react-native';
import { ColorPicker, Host } from '@expo/ui/swift-ui';

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
        onSelectionChange={(next) => onChange(normalizeMedicationAppearanceColor(next))}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { minHeight: 44 },
});
