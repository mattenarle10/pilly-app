import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  PillyBanner,
  PillyButton,
  PillyCard,
  PillyField,
  PillyIconTile,
  MedicationAppearance,
  PillyNumberPicker,
  PillySheet,
  PillyText,
  PillyToggle,
} from '@/design/components';
import { PillyIcon } from '@/design/icons';
import { TimeOrbit } from '@/design/illustrations';
import { colors, radii, shadows, spacing } from '@/design/tokens';
import type {
  MedicationAppearanceShape,
  MedicationAppearanceSize,
  MedicationAppearanceTone,
} from '@/domain/medication';
import { parseTime } from './medication-form';

const appearanceShapes: { value: MedicationAppearanceShape; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
  { value: 'capsule', label: 'Capsule' },
];
const appearanceSizes: { value: MedicationAppearanceSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];
const appearanceTones: {
  value: MedicationAppearanceTone;
  label: string;
  color: string;
}[] = [
  { value: 'rose', label: 'Rose', color: colors.brandSoft },
  { value: 'peach', label: 'Peach', color: colors.peachSoft },
  { value: 'lavender', label: 'Lavender', color: colors.lavenderSoft },
  { value: 'neutral', label: 'Neutral', color: colors.surfaceSubtle },
];

const days = [
  { value: 1, label: 'M', fullLabel: 'Monday' },
  { value: 2, label: 'T', fullLabel: 'Tuesday' },
  { value: 3, label: 'W', fullLabel: 'Wednesday' },
  { value: 4, label: 'T', fullLabel: 'Thursday' },
  { value: 5, label: 'F', fullLabel: 'Friday' },
  { value: 6, label: 'S', fullLabel: 'Saturday' },
  { value: 7, label: 'S', fullLabel: 'Sunday' },
] as const;

function StepHeading({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.heading}>
      <PillyText role="title">{title}</PillyText>
      <PillyText role="caption" muted>
        {message}
      </PillyText>
    </View>
  );
}

export function NameStep({
  autoFocus = true,
  name,
  instructions,
  error,
  onNameChange,
  onInstructionsChange,
}: {
  autoFocus?: boolean;
  name: string;
  instructions: string;
  error?: string;
  onNameChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
}) {
  return (
    <View style={styles.section}>
      <PillyField
        label="Name"
        icon="medicine"
        autoFocus={autoFocus}
        value={name}
        onChangeText={onNameChange}
        placeholder="Printed name"
        error={error}
      />
      <PillyField
        label="Instruction"
        optional
        icon="document"
        value={instructions}
        onChangeText={onInstructionsChange}
        placeholder="One tablet"
        maxLength={500}
      />
    </View>
  );
}

export function AppearanceStep({
  shape,
  size,
  tone,
  secondaryTone,
  onShapeChange,
  onSizeChange,
  onToneChange,
  onSecondaryToneChange,
}: {
  shape: MedicationAppearanceShape;
  size: MedicationAppearanceSize;
  tone: MedicationAppearanceTone;
  secondaryTone: MedicationAppearanceTone;
  onShapeChange: (value: MedicationAppearanceShape) => void;
  onSizeChange: (value: MedicationAppearanceSize) => void;
  onToneChange: (value: MedicationAppearanceTone) => void;
  onSecondaryToneChange: (value: MedicationAppearanceTone) => void;
}) {
  const [showEditor, setShowEditor] = useState(false);
  const title = `${capitalize(size)} ${shape}`;
  const colorSummary =
    shape === 'capsule' ? `${capitalize(tone)} + ${capitalize(secondaryTone)}` : capitalize(tone);

  return (
    <View style={styles.section}>
      <StepHeading title="Appearance" message="Optional recognition aid." />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit pill appearance"
        accessibilityHint={`${title}, ${colorSummary}`}
        onPress={() => setShowEditor(true)}
        style={({ pressed }) => [styles.appearanceRow, pressed && styles.appearanceRowPressed]}
      >
        <MedicationAppearance
          shape={shape}
          size={size}
          tone={tone}
          secondaryTone={secondaryTone}
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

      <PillySheet
        visible={showEditor}
        title="Pill appearance"
        message="Match what you see on the medicine."
        onClose={() => setShowEditor(false)}
      >
        <View style={styles.appearancePreview}>
          <MedicationAppearance
            shape={shape}
            size={size}
            tone={tone}
            secondaryTone={secondaryTone}
          />
          <PillyText role="caption" muted>
            {title} · {colorSummary}
          </PillyText>
        </View>
        <View style={styles.appearanceControls}>
          <ChoiceGroup
            label="Shape"
            options={appearanceShapes}
            value={shape}
            onChange={onShapeChange}
          />
          <ChoiceGroup
            label="Size"
            options={appearanceSizes}
            value={size}
            onChange={onSizeChange}
          />
          <TonePicker
            label={shape === 'capsule' ? 'Color 1' : 'Color'}
            value={tone}
            onChange={onToneChange}
          />
          {shape === 'capsule' ? (
            <TonePicker label="Color 2" value={secondaryTone} onChange={onSecondaryToneChange} />
          ) : null}
        </View>
      </PillySheet>
    </View>
  );
}

function TonePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MedicationAppearanceTone;
  onChange: (value: MedicationAppearanceTone) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <PillyText role="caption" muted>
        {label}
      </PillyText>
      <View style={styles.toneGrid}>
        {appearanceTones.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.toneChoice, selected && styles.toneChoiceActive]}
            >
              <View style={[styles.toneSwatch, { backgroundColor: option.color }]} />
              <PillyText role="caption">{option.label}</PillyText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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

export function DaysStep({
  selected,
  error,
  onChange,
}: {
  selected: number[];
  error?: string;
  onChange: (value: number[]) => void;
}) {
  const toggle = (day: number) =>
    onChange(selected.includes(day) ? selected.filter((item) => item !== day) : [...selected, day]);
  return (
    <View style={styles.section}>
      <StepHeading title="Schedule" message="Choose days." />
      <View style={styles.days}>
        {days.map((day) => {
          const active = selected.includes(day.value);
          return (
            <Pressable
              key={day.value}
              accessibilityRole="checkbox"
              accessibilityLabel={day.fullLabel}
              accessibilityState={{ checked: active }}
              onPress={() => toggle(day.value)}
              style={[styles.day, active && styles.dayActive]}
            >
              <PillyText role="label" style={active ? styles.dayTextActive : undefined}>
                {day.label}
              </PillyText>
              <PillyIcon
                name={active ? 'done' : 'statusEmpty'}
                size={13}
                color={active ? colors.surface : colors.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.quickDays}>
        <PillyButton
          label="Every day"
          size="compact"
          variant="secondary"
          onPress={() => onChange([1, 2, 3, 4, 5, 6, 7])}
          style={styles.quickAction}
        />
        <PillyButton
          label="Weekdays"
          size="compact"
          variant="secondary"
          onPress={() => onChange([1, 2, 3, 4, 5])}
          style={styles.quickAction}
        />
      </View>
      {error ? <PillyBanner kind="error" message={error} compact /> : null}
    </View>
  );
}

export function TimeStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const time = parseTime(value);
  return (
    <View style={styles.section}>
      <StepHeading title="Time" message="Choose a local time." />
      <PillyCard padding="medium" style={styles.timeRow}>
        <TimeOrbit hour={time.getHours()} minute={time.getMinutes()} />
        <View style={styles.timeCopy}>
          <PillyText role="headline">Dose time</PillyText>
          <PillyText role="caption" muted>
            Local time
          </PillyText>
        </View>
        <DateTimePicker
          accessibilityLabel="Dose time"
          value={time}
          mode="time"
          display="compact"
          onValueChange={(_, date) =>
            onChange(
              `${date.getHours()}`.padStart(2, '0') + ':' + `${date.getMinutes()}`.padStart(2, '0'),
            )
          }
        />
      </PillyCard>
    </View>
  );
}

export function DetailsStep({
  supply,
  reminderEnabled,
  error,
  onSupplyChange,
  onReminderChange,
}: {
  supply: string;
  reminderEnabled: boolean;
  error?: string;
  onSupplyChange: (value: string) => void;
  onReminderChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.section}>
      <StepHeading title="Supply and reminder" message="Optional." />
      <PillyNumberPicker
        label="Doses left"
        value={supply.trim() === '' ? null : Number(supply)}
        onChange={(next) => onSupplyChange(next === null ? '' : `${next}`)}
      />
      {error ? <PillyBanner kind="error" message={error} compact /> : null}
      <PillyCard padding="medium" style={styles.switchRow}>
        <PillyIconTile icon="reminder" />
        <View style={styles.switchCopy}>
          <PillyText role="headline">Reminder</PillyText>
          <PillyText role="caption" muted>
            Names stay hidden.
          </PillyText>
        </View>
        <PillyToggle
          label="Local reminder"
          value={reminderEnabled}
          onValueChange={onReminderChange}
        />
      </PillyCard>
    </View>
  );
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
  appearancePreview: { alignItems: 'center', gap: spacing.sm },
  appearanceControls: { gap: spacing.xl },
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
  toneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  toneChoice: {
    width: '48%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  toneChoiceActive: { borderColor: colors.brand },
  toneSwatch: { width: 28, height: 28, borderRadius: radii.round },
  days: { flexDirection: 'row', gap: spacing.xs },
  day: {
    flex: 1,
    minWidth: 44,
    minHeight: 52,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  dayActive: { backgroundColor: colors.brand },
  dayTextActive: { color: colors.surface },
  quickDays: { flexDirection: 'row', gap: spacing.sm },
  quickAction: { flex: 1 },
  timeRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeCopy: { flex: 1, gap: spacing.xs },
  switchRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchCopy: { flex: 1, gap: spacing.xs },
});
