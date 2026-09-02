import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MedicineRecognition } from './medicine-recognition';
import { MedicationAppearancePreview3D } from './medication-appearance-preview-3d';
import { MedicationColorPicker } from './medication-color-picker';
import { PillyDialog } from './pilly-dialog';
import { PillyText } from './pilly-text';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';
import {
  legacyAppearanceShape,
  medicationAppearanceColorName,
  medicationFormName,
  medicationRecognitionDescription,
  type MedicationAppearanceColor,
  type MedicationAppearanceSize,
  type MedicationForm,
  type StoredMedicationForm,
  type TabletShape,
} from '@/models/medication';

const forms: { value: MedicationForm; label: string }[] = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'injection', label: 'Injection' },
  { value: 'drops', label: 'Drops' },
  { value: 'inhaler', label: 'Inhaler' },
];
const tabletShapes: { value: TabletShape; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
];

type Props = {
  form: StoredMedicationForm;
  tabletShape: TabletShape;
  size: MedicationAppearanceSize;
  color: MedicationAppearanceColor;
  secondaryColor: MedicationAppearanceColor;
  onFormChange: (value: StoredMedicationForm) => void;
  onTabletShapeChange: (value: TabletShape) => void;
  onColorChange: (value: MedicationAppearanceColor) => void;
  onSecondaryColorChange: (value: MedicationAppearanceColor) => void;
};

type RememberedColors = Record<
  StoredMedicationForm,
  { color: MedicationAppearanceColor; secondaryColor: MedicationAppearanceColor }
>;

export function MedicineTypeStep(props: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const rememberedColors = useRef<Partial<RememberedColors>>({});
  const title = medicineFormLabel(props.form);
  const summary = medicineTypeSummary(props);
  const details = medicineTypeDetails(props);

  useEffect(() => {
    rememberedColors.current[props.form] = {
      color: props.color,
      secondaryColor: props.secondaryColor,
    };
  }, [props.color, props.form, props.secondaryColor]);

  const changeForm = (form: MedicationForm) => {
    rememberedColors.current[props.form] = {
      color: props.color,
      secondaryColor: props.secondaryColor,
    };
    const remembered = rememberedColors.current[form];
    props.onFormChange(form);
    if (remembered) {
      props.onColorChange(remembered.color);
      props.onSecondaryColorChange(remembered.secondaryColor);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <PillyText role="title">Medicine type</PillyText>
        <PillyText role="caption" muted>
          Recognition aid.
        </PillyText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit medicine type"
        accessibilityHint={summary}
        onPress={() => setShowEditor(true)}
        style={({ pressed }) => [styles.summaryRow, pressed && styles.rowPressed]}
      >
        <MedicineRecognition {...props} display="compact" />
        <View style={styles.summaryCopy}>
          <PillyText role="label">{title}</PillyText>
          <PillyText role="caption" muted>
            {details}
          </PillyText>
        </View>
        <PillyIcon name="next" size={17} color={colors.textSecondary} />
      </Pressable>

      <PillyDialog
        visible={showEditor}
        title="Medicine type"
        message="Match what you see on the medicine."
        actions={[
          {
            label: 'Done',
            variant: 'quiet',
            tone: 'brand',
            onPress: () => setShowEditor(false),
          },
        ]}
        onClose={() => setShowEditor(false)}
      >
        <View style={styles.preview}>
          {props.form === 'tablet' || props.form === 'capsule' ? (
            <MedicationAppearancePreview3D
              shape={legacyAppearanceShape(props.form, props.tabletShape)}
              color={props.color}
              secondaryColor={props.secondaryColor}
              active={showEditor}
            />
          ) : (
            <MedicineRecognition {...props} display="hero" />
          )}
        </View>
        <FormChoices value={props.form} color={props.color} onChange={changeForm} />
        {props.form === 'tablet' ? (
          <ChoiceGroup
            label="Shape"
            options={tabletShapes}
            value={props.tabletShape}
            onChange={props.onTabletShapeChange}
          />
        ) : null}
        <AppearanceColorEditor {...props} />
      </PillyDialog>
    </View>
  );
}

export function medicineFormLabel(form: StoredMedicationForm): string {
  return medicationFormName(form);
}

export function medicineTypeSummary({
  form,
  tabletShape,
  color,
  secondaryColor,
}: Pick<Props, 'form' | 'tabletShape' | 'color' | 'secondaryColor'>): string {
  return medicationRecognitionDescription({ form, tabletShape, color, secondaryColor });
}

function medicineTypeDetails({
  form,
  tabletShape,
  color,
  secondaryColor,
}: Pick<Props, 'form' | 'tabletShape' | 'color' | 'secondaryColor'>): string {
  const parts: string[] = [];
  if (form === 'tablet') parts.push(capitalize(tabletShape));
  const primary = medicationAppearanceColorName(color);
  parts.push(
    form === 'capsule' ? `${primary} + ${medicationAppearanceColorName(secondaryColor)}` : primary,
  );
  return parts.join(' · ');
}

function FormChoices({
  value,
  color,
  onChange,
}: {
  value: StoredMedicationForm;
  color: MedicationAppearanceColor;
  onChange: (value: MedicationForm) => void;
}) {
  const { fontScale } = useWindowDimensions();
  const useSingleColumn = fontScale >= 1.5;

  return (
    <View style={styles.choiceGroup}>
      <PillyText role="caption" muted>
        Type
      </PillyText>
      <View accessibilityRole="radiogroup" style={styles.formGrid}>
        {forms.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.formChoice,
                useSingleColumn && styles.formChoiceLarge,
                selected && styles.formChoiceActive,
                pressed && styles.rowPressed,
              ]}
            >
              <MedicineRecognition
                form={option.value}
                tabletShape="round"
                size="medium"
                color={color}
                display="mini"
              />
              <PillyText
                role="label"
                maxFontSizeMultiplier={useSingleColumn ? undefined : 1.35}
                numberOfLines={useSingleColumn ? undefined : 1}
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
      <View accessibilityRole="radiogroup" style={styles.choiceRow}>
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
  form,
  color,
  secondaryColor,
  onColorChange,
  onSecondaryColorChange,
}: Pick<Props, 'form' | 'color' | 'secondaryColor' | 'onColorChange' | 'onSecondaryColorChange'>) {
  const [activeSlot, setActiveSlot] = useState<CapsuleColorSlot>('primary');
  const editingSecondary = form === 'capsule' && activeSlot === 'secondary';
  const value = editingSecondary ? secondaryColor : color;
  const onChange = editingSecondary ? onSecondaryColorChange : onColorChange;

  return (
    <View style={styles.choiceGroup}>
      <PillyText role="caption" muted>
        Color
      </PillyText>
      {form === 'capsule' ? (
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
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.swatchRing}>
        <View style={[styles.swatch, { backgroundColor: color }]} />
      </View>
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
  summaryRow: {
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
  rowPressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
  summaryCopy: { flex: 1, gap: spacing.xs },
  preview: { minHeight: 108, alignItems: 'center', justifyContent: 'center' },
  choiceGroup: { gap: spacing.sm },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  formChoice: {
    width: '48%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  formChoiceActive: { backgroundColor: colors.brandSoft },
  formChoiceLarge: { width: '100%' },
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
  swatchRing: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  swatch: { width: 20, height: 20, borderRadius: radii.round },
});
