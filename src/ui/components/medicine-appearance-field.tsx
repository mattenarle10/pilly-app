import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MedicationAppearance } from './medication-appearance';
import { MedicationAppearancePreview3D } from './medication-appearance-preview-3d';
import { MedicationColorPicker } from './medication-color-picker';
import { PillyDialog } from './pilly-dialog';
import { PillyText } from './pilly-text';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';
import {
  medicationAppearanceColorName,
  type MedicationAppearanceColor,
  type MedicationAppearanceShape,
  type MedicationAppearanceSize,
} from '@/models/medication';

const shapes: { value: MedicationAppearanceShape; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
  { value: 'capsule', label: 'Capsule' },
];
type Props = {
  shape: MedicationAppearanceShape;
  size: MedicationAppearanceSize;
  color: MedicationAppearanceColor;
  secondaryColor: MedicationAppearanceColor;
  onShapeChange: (value: MedicationAppearanceShape) => void;
  onColorChange: (value: MedicationAppearanceColor) => void;
  onSecondaryColorChange: (value: MedicationAppearanceColor) => void;
  enableThreeDimensionalPreview?: boolean;
};

export function AppearanceStep(props: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const title = capitalize(props.shape);
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
        footerAction={{ label: 'Done', onPress: () => setShowEditor(false) }}
        onClose={() => setShowEditor(false)}
      >
        <View style={styles.preview}>
          {props.enableThreeDimensionalPreview ? (
            <MedicationAppearancePreview3D
              shape={props.shape}
              color={props.color}
              secondaryColor={props.secondaryColor}
              active={showEditor}
            />
          ) : (
            <MedicationAppearance
              shape={props.shape}
              size="medium"
              color={props.color}
              secondaryColor={props.secondaryColor}
            />
          )}
        </View>
        <ChoiceGroup
          label="Shape"
          options={shapes}
          value={props.shape}
          onChange={props.onShapeChange}
        />
        <AppearanceColorEditor
          shape={props.shape}
          color={props.color}
          secondaryColor={props.secondaryColor}
          onColorChange={props.onColorChange}
          onSecondaryColorChange={props.onSecondaryColorChange}
        />
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
              <PillyText
                role="label"
                maxFontSizeMultiplier={1.4}
                numberOfLines={1}
                style={selected ? styles.choiceTextActive : undefined}
              >
                {option.label}
              </PillyText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type CapsuleColorSlot = 'primary' | 'secondary';

function AppearanceColorEditor({
  shape,
  color,
  secondaryColor,
  onColorChange,
  onSecondaryColorChange,
}: Pick<Props, 'shape' | 'color' | 'secondaryColor' | 'onColorChange' | 'onSecondaryColorChange'>) {
  const [activeSlot, setActiveSlot] = useState<CapsuleColorSlot>('primary');
  const editingSecondary = shape === 'capsule' && activeSlot === 'secondary';
  const value = editingSecondary ? secondaryColor : color;
  const onChange = editingSecondary ? onSecondaryColorChange : onColorChange;

  return (
    <View style={styles.choiceGroup}>
      <PillyText role="caption" muted>
        Color
      </PillyText>
      {shape === 'capsule' ? (
        <View accessibilityRole="radiogroup" style={styles.colorTargets}>
          <ColorTarget
            label="Left"
            accessibilityLabel="Edit left half color"
            color={color}
            selected={activeSlot === 'primary'}
            onPress={() => setActiveSlot('primary')}
          />
          <ColorTarget
            label="Right"
            accessibilityLabel="Edit right half color"
            color={secondaryColor}
            selected={activeSlot === 'secondary'}
            onPress={() => setActiveSlot('secondary')}
          />
        </View>
      ) : null}
      <MedicationColorPicker label="Choose color" value={value} onChange={onChange} />
    </View>
  );
}

function ColorTarget({
  label,
  accessibilityLabel,
  color,
  selected,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  color: MedicationAppearanceColor;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.colorTarget,
        selected && styles.colorTargetActive,
        pressed && styles.colorTargetPressed,
      ]}
    >
      <View style={[styles.targetSwatch, { backgroundColor: color }]} />
      <PillyText role="label">{label}</PillyText>
    </Pressable>
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
  colorTargets: { flexDirection: 'row', gap: spacing.sm },
  colorTarget: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
  },
  colorTargetActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  colorTargetPressed: { opacity: 0.72 },
  targetSwatch: {
    width: 22,
    height: 22,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
