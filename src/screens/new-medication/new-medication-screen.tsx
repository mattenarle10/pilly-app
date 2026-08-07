import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { z } from 'zod';

import { PillyButton, PillyText, Screen } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { weekdayMask } from '@/domain/schedule';
import { useRepository } from '@/providers';
import { scheduleLocalReminders } from '@/platform/notifications';

const draftKey = 'new-medication-draft-v1';
const days = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
] as const;
const draftSchema = z.object({
  name: z.string(),
  instructions: z.string(),
  selectedDays: z.array(z.number()),
  time: z.string(),
  supply: z.string(),
  reminderEnabled: z.boolean(),
});
type Draft = z.infer<typeof draftSchema>;
const defaults: Draft = {
  name: '',
  instructions: '',
  selectedDays: [1, 2, 3, 4, 5, 6, 7],
  time: '09:00',
  supply: '',
  reminderEnabled: false,
};

function parseTime(value: string): Date {
  const [hour = 9, minute = 0] = value.split(':').map(Number);
  return new Date(2000, 0, 1, hour, minute);
}

export function NewMedicationScreen() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: defaults,
    onSubmit: async ({ value }) => createMutation.mutateAsync(value),
  });
  const createMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (value: Draft) => {
      const parsedSupply = value.supply.trim() === '' ? null : Number(value.supply);
      const result = await repository.createMedication({
        name: value.name,
        instructions: value.instructions,
        supplyCount: parsedSupply,
        schedules: [
          {
            hour: parseTime(value.time).getHours(),
            minute: parseTime(value.time).getMinutes(),
            weekdayMask: weekdayMask(value.selectedDays),
            sortOrder: 0,
            reminderEnabled: value.reminderEnabled,
          },
        ],
      });
      await scheduleLocalReminders(result.schedules);
      return result;
    },
    onSuccess: async () => {
      await Storage.removeItem(draftKey);
      await queryClient.invalidateQueries();
      router.replace('/(tabs)/today');
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : 'Pilly could not save this medicine.'),
  });

  useEffect(() => {
    void Storage.getItem(draftKey)
      .then((raw) => {
        if (!raw) return;
        const parsed = draftSchema.safeParse(JSON.parse(raw));
        if (parsed.success) form.reset(parsed.data);
      })
      .catch(() => undefined);
  }, [form]);

  const saveDraft = (value: Draft) => Storage.setItem(draftKey, JSON.stringify(value));
  const next = (value: Draft) => {
    const checks = [
      z.string().trim().min(1, 'Enter the name printed on the label.').safeParse(value.name),
      z.array(z.number()).min(1, 'Choose at least one day.').safeParse(value.selectedDays),
      z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .safeParse(value.time),
    ];
    const check = checks[step];
    if (check && !check.success) {
      setError(check.error.issues[0]?.message ?? 'Check this step.');
      return;
    }
    setError(null);
    void saveDraft(value);
    setStep((current) => Math.min(3, current + 1));
  };

  return (
    <Screen>
      <View style={styles.header}>
        <PillyButton
          label="Back"
          variant="quiet"
          onPress={() => (step === 0 ? router.back() : setStep((value) => value - 1))}
        />
        <PillyText role="caption" muted>
          Step {step + 1} of 4
        </PillyText>
      </View>
      <form.Subscribe selector={(state) => state.values}>
        {(value) => (
          <>
            {step === 0 ? (
              <View style={styles.section}>
                <PillyText role="large-title">What is the medicine called?</PillyText>
                <PillyText muted>
                  Use the name printed on its label. You can add a short instruction too.
                </PillyText>
                <form.Field name="name">
                  {(field) => (
                    <TextInput
                      accessibilityLabel="Medicine name"
                      autoFocus
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      placeholder="Medicine name"
                      placeholderTextColor={colors.textSecondary}
                      style={styles.input}
                    />
                  )}
                </form.Field>
                <form.Field name="instructions">
                  {(field) => (
                    <TextInput
                      accessibilityLabel="Instructions"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      placeholder="For example, one tablet"
                      placeholderTextColor={colors.textSecondary}
                      style={styles.input}
                    />
                  )}
                </form.Field>
              </View>
            ) : null}
            {step === 1 ? (
              <View style={styles.section}>
                <PillyText role="large-title">Which days?</PillyText>
                <PillyText muted>Choose every day it should appear.</PillyText>
                <form.Field name="selectedDays">
                  {(field) => (
                    <View style={styles.days}>
                      {days.map((day) => {
                        const active = field.state.value.includes(day.value);
                        return (
                          <Pressable
                            key={day.value}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: active }}
                            onPress={() =>
                              field.handleChange(
                                active
                                  ? field.state.value.filter((value) => value !== day.value)
                                  : [...field.state.value, day.value],
                              )
                            }
                            style={[styles.day, active && styles.dayActive]}
                          >
                            <PillyText
                              role="label"
                              style={active ? styles.dayTextActive : undefined}
                            >
                              {day.label}
                            </PillyText>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </form.Field>
              </View>
            ) : null}
            {step === 2 ? (
              <View style={styles.section}>
                <PillyText role="large-title">What time?</PillyText>
                <PillyText muted>This creates one expected dose on each selected day.</PillyText>
                <form.Field name="time">
                  {(field) => (
                    <DateTimePicker
                      accessibilityLabel="Dose time"
                      value={parseTime(field.state.value)}
                      mode="time"
                      display="spinner"
                      onChange={(_, date) => {
                        if (date)
                          field.handleChange(
                            `${date.getHours()}`.padStart(2, '0') +
                              ':' +
                              `${date.getMinutes()}`.padStart(2, '0'),
                          );
                      }}
                    />
                  )}
                </form.Field>
              </View>
            ) : null}
            {step === 3 ? (
              <View style={styles.section}>
                <PillyText role="large-title">A couple of useful details</PillyText>
                <form.Field name="supply">
                  {(field) => (
                    <>
                      <PillyText role="headline">How many doses remain?</PillyText>
                      <TextInput
                        accessibilityLabel="Remaining supply"
                        keyboardType="decimal-pad"
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        placeholder="Optional"
                        placeholderTextColor={colors.textSecondary}
                        style={styles.input}
                      />
                    </>
                  )}
                </form.Field>
                <form.Field name="reminderEnabled">
                  {(field) => (
                    <View style={styles.switchRow}>
                      <View style={styles.switchCopy}>
                        <PillyText role="headline">Local reminder</PillyText>
                        <PillyText muted>Your notification can hide the medicine name.</PillyText>
                      </View>
                      <Switch
                        accessibilityLabel="Local reminder"
                        value={field.state.value}
                        onValueChange={field.handleChange}
                      />
                    </View>
                  )}
                </form.Field>
              </View>
            ) : null}
            {error ? (
              <PillyText accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </PillyText>
            ) : null}
            <View style={styles.footer}>
              {step < 3 ? (
                <PillyButton label="Continue" onPress={() => next(value)} />
              ) : (
                <PillyButton
                  label={createMutation.isPending ? 'Saving…' : 'Save medicine'}
                  disabled={createMutation.isPending}
                  onPress={() => void form.handleSubmit()}
                />
              )}
            </View>
          </>
        )}
      </form.Subscribe>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: { gap: spacing.lg, paddingTop: spacing.xxl },
  footer: { marginTop: 'auto', paddingTop: spacing.xxxl },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    color: colors.textPrimary,
  },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  day: {
    minWidth: 64,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dayActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  dayTextActive: { color: colors.surface },
  switchRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  switchCopy: { flex: 1, gap: spacing.xs },
  error: { color: colors.danger, marginTop: spacing.lg },
});
