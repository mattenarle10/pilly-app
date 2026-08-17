import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MedicationAppearance } from './medication-appearance';
import { MedicationColorPicker } from './medication-color-picker';
import { PillyDialog } from './pilly-dialog';
import { PillyText } from './pilly-text';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';
import {
  medicationAppearanceColorName,
  medicationAppearancePresets,
  type MedicationAppearanceColor,
  type MedicationAppearanceShape,
  type MedicationAppearanceSize,
} from '@/models/medication';

const shapes: { value: MedicationAppearanceShape; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
  { value: 'capsule', label: 'Capsule' },
];
const sizes: { value: MedicationAppearanceSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

type Props = {
  shape: MedicationAppearanceShape;
  size: MedicationAppearanceSize;
  color: MedicationAppearanceColor;
  secondaryColor: MedicationAppearanceColor;
  onShapeChange: (value: MedicationAppearanceShape) => void;
  onSizeChange: (value: MedicationAppearanceSize) => void;
  onColorChange: (value: MedicationAppearanceColor) => void;
  onSecondaryColorChange: (value: MedicationAppearanceColor) => void;
};

export function AppearanceStep(props: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const title = `${capitalize(props.size)} ${props.shape}`;
  const colorSummary = appearanceColorSummary(props.shape, props.color, props.secondaryColor);

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <PillyText role="title">Appearance</PillyText>
        <PillyText role="caption" muted>
          Optional recognition aid.
        </PillyText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit pill appearance"
        accessibilityHint={`${title}, ${colorSummary}`}
        onPress={() => setShowEditor(true)}
        style={({ pressed }) => [styles.appearanceRow, pressed && styles.appearanceRowPressed]}
      >
        <MedicationAppearance
          shape={props.shape}
          size={props.size}
          color={props.color}
          secondaryColor={props.secondaryColor}
          display="compact"
        />
        <View style={styles.appearanceRowCopy}>
          <PillyText role="label">{title}</PillyText>
          <PillyText role="caption" muted>
            {colorSummary}
          </PillyText>
        </View>
        <PillyIcon name="next" size={17} color={colors.textSecondary} />
      </Pressable>

      <PillyDialog
        visible={showEditor}
        title="Pill appearance"
        message="Match what you see on the medicine."
        onClose={() => setShowEditor(false)}
      >
        <View style={styles.preview}>
          <MedicationAppearance
            shape={props.shape}
            size={props.size}
            color={props.color}
            secondaryColor={props.secondaryColor}
          />
          <PillyText role="caption" muted>
            {title} · {colorSummary}
          </PillyText>
        </View>
        <ChoiceGroup
          label="Shape"
          options={shapes}
          value={props.shape}
          onChange={props.onShapeChange}
        />
        <ChoiceGroup
          label="Size"
          options={sizes}
          value={props.size}
          onChange={props.onSizeChange}
        />
        <ColorChoiceGroup
          label={props.shape === 'capsule' ? 'Color 1' : 'Color'}
          value={props.color}
          onChange={props.onColorChange}
        />
        {props.shape === 'capsule' ? (
          <ColorChoiceGroup
            label="Color 2"
            value={props.secondaryColor}
            onChange={props.onSecondaryColorChange}
          />
        ) : null}
      </PillyDialog>
    </View>
  );
}

export function appearanceColorSummary(
  shape: MedicationAppearanceShape,
  color: MedicationAppearanceColor,
  secondaryColor: MedicationAppearanceColor,
): string {
  const primary = medicationAppearanceColorName(color);
  return shape === 'capsule'
    ? `${primary} + ${medicationAppearanceColorName(secondaryColor)}`
    : primary;
}

function ChoiceGroup<Value extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <PillyText role="caption" muted>
        {label}
      </PillyText>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.choice, selected && styles.choiceActive]}
            >
              <PillyText role="label" style={selected ? styles.choiceTextActive : undefined}>
                {option.label}
              </PillyText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ColorChoiceGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MedicationAppearanceColor;
  onChange: (value: MedicationAppearanceColor) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <PillyText role="caption" muted>
        {label}
      </PillyText>
      <View accessibilityRole="radiogroup" style={styles.swatches}>
        {medicationAppearancePresets.map((preset) => {
          const selected = preset.color === value;
          return (
            <Pressable
              key={preset.label}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${preset.label}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(preset.color)}
              style={({ pressed }) => [
                styles.swatchChoice,
                selected && styles.swatchChoiceActive,
                pressed && styles.swatchChoicePressed,
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: preset.color }]} />
              <PillyText role="caption">{preset.label}</PillyText>
            </Pressable>
          );
        })}
      </View>
      <MedicationColorPicker label="Custom color" value={value} onChange={onChange} />
    </View>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg, paddingTop: spacing.lg },
  heading: { gap: spacing.xs },
  appearanceRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    ...shadows.soft,
  },
  appearanceRowPressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
  appearanceRowCopy: { flex: 1, gap: spacing.xs },
  preview: { alignItems: 'center', gap: spacing.sm },
  choiceGroup: { gap: spacing.sm },
  choiceRow: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
  },
  choiceActive: { backgroundColor: colors.brand },
  choiceTextActive: { color: colors.surface },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatchChoice: {
    minWidth: 92,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceSubtle,
    borderRadius: radii.round,
  },
  swatchChoiceActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  swatchChoicePressed: { opacity: 0.72 },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
