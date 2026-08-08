import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  PillyBanner,
  PillyButton,
  PillyCard,
  PillyField,
  PillyIconTile,
  PillyNumberPicker,
  PillyText,
  PillyToggle,
} from '@/design/components';
import { TimeOrbit } from '@/design/illustrations';
import { colors, radii, spacing } from '@/design/tokens';
import { parseTime } from './new-medication-form';

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
        icon="medkit-outline"
        autoFocus={autoFocus}
        value={name}
        onChangeText={onNameChange}
        placeholder="Printed name"
        error={error}
      />
      <PillyField
        label="Instruction"
        optional
        icon="document-text-outline"
        value={instructions}
        onChangeText={onInstructionsChange}
        placeholder="One tablet"
        maxLength={500}
      />
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
              <Ionicons
                name={active ? 'checkmark' : 'ellipse-outline'}
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
        <PillyIconTile icon="notifications-outline" />
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
