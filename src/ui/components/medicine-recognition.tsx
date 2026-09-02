import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { MedicationAppearance } from './medication-appearance';
import type {
  MedicationAppearanceColor,
  MedicationAppearanceSize,
  StoredMedicationForm,
  TabletShape,
} from '@/models/medication';
import { legacyAppearanceShape } from '@/models/medication';
import { colors } from '@/ui/tokens';

type Props = {
  form: StoredMedicationForm;
  tabletShape: TabletShape;
  size: MedicationAppearanceSize;
  color: MedicationAppearanceColor;
  secondaryColor?: MedicationAppearanceColor;
  display?: 'mini' | 'compact' | 'hero';
  accessibilityLabel?: string;
};

const frameSizes = {
  mini: { width: 38, height: 30, icon: 28 },
  compact: { width: 72, height: 52, icon: 48 },
  hero: { width: 104, height: 76, icon: 70 },
} as const;

export function MedicineRecognition({
  form,
  tabletShape,
  size,
  color,
  secondaryColor = color,
  display = 'hero',
  accessibilityLabel,
}: Props) {
  if (form === 'tablet' || form === 'capsule') {
    return (
      <View
        testID={`medicine-form-${form}`}
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
      >
        <MedicationAppearance
          shape={legacyAppearanceShape(form, tabletShape)}
          size={size}
          color={color}
          secondaryColor={secondaryColor}
          display={display}
        />
      </View>
    );
  }

  const frame = frameSizes[display];
  return (
    <View
      testID={`medicine-form-${form}`}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[styles.frame, { width: frame.width, height: frame.height }]}
    >
      <Svg
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        width={frame.icon}
        height={frame.icon}
        viewBox="0 0 72 72"
      >
        <MedicineFormGlyph form={form} color={color} />
      </Svg>
    </View>
  );
}

function MedicineFormGlyph({
  form,
  color,
}: {
  form: Exclude<StoredMedicationForm, 'tablet' | 'capsule'>;
  color: MedicationAppearanceColor;
}) {
  const stroke = colors.textPrimary;
  const shared = { stroke, strokeWidth: 2.5, strokeLinecap: 'round' as const };

  switch (form) {
    case 'liquid':
      return (
        <G>
          <Rect x="26" y="10" width="20" height="10" rx="3" fill={color} {...shared} />
          <Path
            d="M23 25 Q23 20 28 20 H44 Q49 20 49 25 V58 Q49 62 45 62 H27 Q23 62 23 58 Z"
            fill={color}
            {...shared}
          />
          <Path d="M24 39 H48" {...shared} />
          <Path d="M31 49 H41" {...shared} />
        </G>
      );
    case 'injection':
      return (
        <G transform="rotate(-35 36 36)">
          <Rect x="27" y="18" width="18" height="35" rx="7" fill={color} {...shared} />
          <Line x1="27" y1="27" x2="45" y2="27" {...shared} />
          <Line x1="31" y1="22" x2="31" y2="16" {...shared} />
          <Line x1="41" y1="22" x2="41" y2="16" {...shared} />
          <Line x1="31" y1="58" x2="41" y2="58" {...shared} />
          <Line x1="36" y1="53" x2="36" y2="62" {...shared} />
        </G>
      );
    case 'drops':
      return (
        <G>
          <Rect x="27" y="11" width="18" height="10" rx="3" fill={color} {...shared} />
          <Path
            d="M23 28 Q23 21 30 21 H42 Q49 21 49 28 V50 Q49 58 41 58 H31 Q23 58 23 50 Z"
            fill={color}
            {...shared}
          />
          <Path
            d="M36 32 C31 39 29 42 29 46 A7 7 0 0 0 43 46 C43 42 41 39 36 32 Z"
            fill={colors.surface}
            {...shared}
          />
        </G>
      );
    case 'inhaler':
      return (
        <G>
          <Path d="M25 13 H41 Q46 13 46 18 V43 H25 Z" fill={color} {...shared} />
          <Path
            d="M25 34 H46 V55 H54 Q58 55 58 59 V62 H31 Q25 62 25 56 Z"
            fill={color}
            {...shared}
          />
          <Line x1="29" y1="20" x2="42" y2="20" {...shared} />
        </G>
      );
    case 'other':
      return (
        <G>
          <Circle cx="36" cy="36" r="23" fill={color} {...shared} />
          <Line x1="36" y1="25" x2="36" y2="47" {...shared} />
          <Line x1="25" y1="36" x2="47" y2="36" {...shared} />
        </G>
      );
  }
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
});
