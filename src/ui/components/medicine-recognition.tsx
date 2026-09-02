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

const glyphViewBoxes: Record<Exclude<StoredMedicationForm, 'tablet' | 'capsule'>, string> = {
  liquid: '18 7 36 60',
  injection: '14 8 44 58',
  drops: '18 7 36 58',
  inhaler: '18 9 44 58',
  other: '10 10 52 54',
};

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
        viewBox={glyphViewBoxes[form]}
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
  const body = {
    fill: color,
    stroke: colors.textPrimary,
    strokeOpacity: 0.18,
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const detail = {
    fill: 'none',
    stroke: colors.textPrimary,
    strokeOpacity: 0.22,
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
  };
  const highlight = {
    fill: 'none',
    stroke: colors.surface,
    strokeOpacity: 0.48,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
  };
  const shadow = { fill: colors.textPrimary, opacity: 0.07 };

  switch (form) {
    case 'liquid':
      return (
        <G>
          <Path
            d="M23 27 Q23 22 28 22 H44 Q49 22 49 27 V58 Q49 63 44 63 H28 Q23 63 23 58 Z"
            transform="translate(0 2)"
            {...shadow}
          />
          <Rect x="26" y="10" width="20" height="11" rx="3" {...body} />
          <Path
            d="M23 27 Q23 22 28 22 H44 Q49 22 49 27 V58 Q49 63 44 63 H28 Q23 63 23 58 Z"
            {...body}
          />
          <Path d="M27 29 V38" {...highlight} />
          <Path d="M24 40 H48" {...detail} />
          <Path d="M31 51 H41" {...detail} />
        </G>
      );
    case 'injection':
      return (
        <G transform="rotate(-35 36 36)">
          <Rect
            x="27"
            y="18"
            width="18"
            height="38"
            rx="8"
            transform="translate(0 2)"
            {...shadow}
          />
          <Rect x="27" y="18" width="18" height="38" rx="8" {...body} />
          <Path d="M31 22 V31" {...highlight} />
          <Line x1="27" y1="29" x2="45" y2="29" {...detail} />
          <Line x1="31" y1="22" x2="31" y2="15" {...detail} />
          <Line x1="41" y1="22" x2="41" y2="15" {...detail} />
          <Line x1="30" y1="60" x2="42" y2="60" {...detail} />
          <Line x1="36" y1="56" x2="36" y2="63" {...detail} />
        </G>
      );
    case 'drops':
      return (
        <G>
          <Path
            d="M23 29 Q23 22 30 22 H42 Q49 22 49 29 V50 Q49 59 41 59 H31 Q23 59 23 50 Z"
            transform="translate(0 2)"
            {...shadow}
          />
          <Rect x="27" y="11" width="18" height="10" rx="3" {...body} />
          <Path
            d="M23 29 Q23 22 30 22 H42 Q49 22 49 29 V50 Q49 59 41 59 H31 Q23 59 23 50 Z"
            {...body}
          />
          <Path d="M27 30 V37" {...highlight} />
          <Path
            d="M36 33 C32 39 30 42 30 46 A6 6 0 0 0 42 46 C42 42 40 39 36 33 Z"
            fill={colors.surface}
            stroke={colors.textPrimary}
            strokeOpacity={0.14}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        </G>
      );
    case 'inhaler':
      return (
        <G>
          <Path
            d="M25 15 H41 Q46 15 46 20 V55 H54 Q58 55 58 59 V63 H31 Q25 63 25 57 Z"
            transform="translate(0 2)"
            {...shadow}
          />
          <Path d="M25 13 H41 Q46 13 46 18 V43 H25 Z" {...body} />
          <Path d="M25 34 H46 V55 H54 Q58 55 58 59 V62 H31 Q25 62 25 56 Z" {...body} />
          <Path d="M29 18 H39" {...highlight} />
          <Line x1="29" y1="21" x2="42" y2="21" {...detail} />
          <Line x1="25" y1="43" x2="46" y2="43" {...detail} />
        </G>
      );
    case 'other':
      return (
        <G>
          <Circle cx="36" cy="38" r="23" {...shadow} />
          <Circle cx="36" cy="36" r="23" {...body} />
          <Path d="M26 29 A12 12 0 0 1 34 24" {...highlight} />
          <Line x1="36" y1="25" x2="36" y2="47" {...detail} />
          <Line x1="25" y1="36" x2="47" y2="36" {...detail} />
        </G>
      );
  }
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
});
