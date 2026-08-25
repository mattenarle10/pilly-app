import { Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { PillyBanner } from './pilly-banner';
import { PillyButton } from './pilly-button';
import { PillyCard } from './pilly-card';
import { PillyField } from './pilly-field';
import { PillyIconButton } from './pilly-icon-button';
import { PillyNumberPicker } from './pilly-number-picker';
import { PillyText } from './pilly-text';
import { PillyToggle } from './pilly-toggle';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, spacing } from '@/ui/tokens';
import { parseTime, type MedicationScheduleDraft } from '@/models/medicine-form';
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
  nameTestID,
  name,
  instructions,
  error,
  onNameChange,
  onInstructionsChange,
}: {
  autoFocus?: boolean;
  nameTestID?: string;
  name: string;
  instructions: string;
  error?: string;
  onNameChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
}) {
  return (
    <View style={styles.identitySection}>
      <PillyField
        testID={nameTestID}
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

export function ScheduleStep({
  selectedDays,
  schedules,
  error,
  onDaysChange,
  onSchedulesChange,
}: {
  selectedDays: number[];
  schedules: MedicationScheduleDraft[];
  error?: string;
  onDaysChange: (value: number[]) => void;
  onSchedulesChange: (value: MedicationScheduleDraft[]) => void;
}) {
  const toggle = (day: number) =>
    onDaysChange(
      selectedDays.includes(day)
        ? selectedDays.filter((item) => item !== day)
        : [...selectedDays, day],
    );
  const updateSchedule = (index: number, next: Partial<MedicationScheduleDraft>) =>
    onSchedulesChange(
      schedules.map((schedule, scheduleIndex) =>
        scheduleIndex === index ? { ...schedule, ...next } : schedule,
      ),
    );
  const addSchedule = () => {
    if (schedules.length >= 8) return;
    const time = nextScheduleTime(schedules);
    const lastSchedule = [...schedules]
      .sort((left, right) => left.time.localeCompare(right.time))
      .at(-1);
    onSchedulesChange(
      [...schedules, { time, reminderEnabled: lastSchedule?.reminderEnabled ?? false }].sort(
        (left, right) => left.time.localeCompare(right.time),
      ),
    );
  };
  const removeSchedule = (index: number) => {
    if (schedules.length <= 1) return;
    onSchedulesChange(schedules.filter((_, scheduleIndex) => scheduleIndex !== index));
  };

  return (
    <View style={styles.section}>
      <StepHeading title="Schedule" message="Choose days and exact local times." />
      <View style={styles.days}>
        {days.map((day) => {
          const active = selectedDays.includes(day.value);
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
            </Pressable>
          );
        })}
      </View>
      <View style={styles.quickDays}>
        <PillyButton
          label="Every day"
          size="compact"
          variant="secondary"
          onPress={() => onDaysChange([1, 2, 3, 4, 5, 6, 7])}
          style={styles.quickAction}
        />
        <PillyButton
          label="Weekdays"
          size="compact"
          variant="secondary"
          onPress={() => onDaysChange([1, 2, 3, 4, 5])}
          style={styles.quickAction}
        />
      </View>
      <PillyCard padding="none" style={styles.scheduleSurface}>
        {schedules.map((schedule, index) => {
          const time = parseTime(schedule.time);
          return (
            <View key={index}>
              {index > 0 ? <View style={styles.scheduleSeparator} /> : null}
              <View style={styles.scheduleItem}>
                <View style={styles.scheduleTimeRow}>
                  <PillyText role="label" style={styles.scheduleLabel}>
                    {timeContextLabel(schedule.time)}
                  </PillyText>
                  <DateTimePicker
                    accessibilityLabel={`${timeContextLabel(schedule.time)} dose time`}
                    value={time}
                    mode="time"
                    display="compact"
                    onValueChange={(_, date) =>
                      updateSchedule(index, {
                        time:
                          `${date.getHours()}`.padStart(2, '0') +
                          ':' +
                          `${date.getMinutes()}`.padStart(2, '0'),
                      })
                    }
                  />
                  {schedules.length > 1 ? (
                    <PillyIconButton
                      icon="remove"
                      label={`Remove ${timeContextLabel(schedule.time)} dose time`}
                      onPress={() => removeSchedule(index)}
                      style={styles.removeSchedule}
                    />
                  ) : null}
                </View>
                <View style={styles.scheduleReminderRow}>
                  <PillyText role="caption" muted style={styles.scheduleLabel}>
                    Reminder
                  </PillyText>
                  <PillyToggle
                    label={`Reminder for ${timeContextLabel(schedule.time)} dose`}
                    value={schedule.reminderEnabled}
                    onValueChange={(reminderEnabled) => updateSchedule(index, { reminderEnabled })}
                  />
                </View>
              </View>
            </View>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add another dose time"
          accessibilityState={{ disabled: schedules.length >= 8 }}
          disabled={schedules.length >= 8}
          onPress={addSchedule}
          style={({ pressed }) => [
            styles.addSchedule,
            pressed && styles.addSchedulePressed,
            schedules.length >= 8 && styles.addScheduleDisabled,
          ]}
        >
          <PillyIcon name="add" size={18} color={colors.brand} />
          <PillyText role="label" style={styles.addScheduleLabel}>
            Add another time
          </PillyText>
        </Pressable>
      </PillyCard>
      {error ? <PillyBanner kind="error" message={error} compact /> : null}
    </View>
  );
}

function timeContextLabel(value: string): string {
  const hour = parseTime(value).getHours();
  if (hour < 5) return 'Night';
  if (hour < 11) return 'Morning';
  if (hour < 14) return 'Midday';
  if (hour < 18) return 'Afternoon';
  if (hour < 22) return 'Evening';
  return 'Night';
}

function nextScheduleTime(schedules: MedicationScheduleDraft[]): string {
  const existing = new Set(schedules.map((schedule) => schedule.time));
  const latest = [...existing].sort().at(-1) ?? '09:00';
  const suggestion = ['08:00', '12:00', '18:00', '21:00'].find(
    (time) => time > latest && !existing.has(time),
  );
  if (suggestion) return suggestion;
  const unusedSuggestion = ['08:00', '12:00', '18:00', '21:00'].find((time) => !existing.has(time));
  if (unusedSuggestion) return unusedSuggestion;

  const latestTime = parseTime(latest);
  for (let offset = 1; offset < 24; offset += 1) {
    const hour = (latestTime.getHours() + offset) % 24;
    const candidate =
      `${hour}`.padStart(2, '0') + ':' + `${latestTime.getMinutes()}`.padStart(2, '0');
    if (!existing.has(candidate)) return candidate;
  }
  return '09:00';
}

export function DetailsStep({
  supply,
  error,
  onSupplyChange,
}: {
  supply: string;
  error?: string;
  onSupplyChange: (value: string) => void;
}) {
  return (
    <View style={styles.section}>
      <StepHeading title="Supply" message="Optional." />
      <PillyNumberPicker
        label="Doses left"
        value={supply.trim() === '' ? null : Number(supply)}
        onChange={(next) => onSupplyChange(next === null ? '' : `${next}`)}
      />
      {error ? <PillyBanner kind="error" message={error} compact /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg, paddingTop: spacing.lg },
  identitySection: { gap: spacing.lg },
  heading: { gap: spacing.xs },
  days: { flexDirection: 'row', gap: spacing.xs },
  day: {
    flex: 1,
    minWidth: 44,
    height: 44,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  dayActive: { backgroundColor: colors.brandSoft },
  dayTextActive: { color: colors.brandStrong },
  quickDays: { flexDirection: 'row', gap: spacing.sm },
  quickAction: { flex: 1 },
  scheduleSurface: { overflow: 'hidden' },
  scheduleItem: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  scheduleTimeRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scheduleReminderRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scheduleLabel: { flex: 1 },
  removeSchedule: { width: 44, height: 44, backgroundColor: colors.surfaceSubtle },
  scheduleSeparator: {
    height: 1,
    marginLeft: spacing.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  addSchedule: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  addSchedulePressed: { backgroundColor: colors.surfaceSubtle },
  addScheduleDisabled: { opacity: 0.4 },
  addScheduleLabel: { color: colors.brand },
});
