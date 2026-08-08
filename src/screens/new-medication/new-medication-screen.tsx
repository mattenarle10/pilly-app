import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';

import { PillyBanner, PillyButton, PillyIconButton, PillyModal, Screen } from '@/design/components';
import { colors, radii, spacing } from '@/design/tokens';
import { weekdayMask } from '@/domain/schedule';
import { scheduleLocalReminders } from '@/platform/notifications';
import { useRepository } from '@/providers';
import { draftMessages, friendlySaveError } from './new-medication-errors';
import {
  assertMedicationDraft,
  defaults,
  draftKey,
  draftSchema,
  parseTime,
  supplyValue,
  type MedicationDraft,
} from './new-medication-form';
import { DaysStep, DetailsStep, NameStep, TimeStep } from './new-medication-steps';
import { useMedicationValidation } from './use-medication-validation';

export function NewMedicationScreen() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const validation = useMedicationValidation();
  const [step, setStep] = useState(0);
  const [draftWarning, setDraftWarning] = useState<string | null>(null);
  const [showExit, setShowExit] = useState(false);
  const form = useForm({
    defaultValues: defaults,
    onSubmit: ({ value }) => createMutation.mutate(value),
  });
  const createMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (value: MedicationDraft) => {
      assertMedicationDraft(value);
      await repository.createMedication({
        name: value.name.trim(),
        instructions: value.instructions.trim(),
        supplyCount: supplyValue(value.supply),
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
      let reminderStatus: 'notRequested' | 'denied' | 'scheduled' | 'failed' = 'notRequested';
      try {
        reminderStatus = await scheduleLocalReminders(await repository.listReminderSchedules());
      } catch {
        reminderStatus = 'failed';
      }
      return { reminderStatus };
    },
    onSuccess: async ({ reminderStatus }) => {
      await Storage.removeItem(draftKey).catch(() => undefined);
      await repository.setSetting(
        'reminderNotice',
        reminderStatus === 'denied' ? 'denied' : reminderStatus === 'failed' ? 'failed' : 'none',
      );
      await queryClient.invalidateQueries();
      router.replace('/(tabs)/today');
    },
  });

  useEffect(() => {
    void Storage.getItem(draftKey)
      .then((raw) => {
        if (!raw) return;
        const parsed = draftSchema.safeParse(JSON.parse(raw));
        if (parsed.success) form.reset(parsed.data);
        else {
          void Storage.removeItem(draftKey);
          setDraftWarning(draftMessages.reset);
        }
      })
      .catch(() => setDraftWarning(draftMessages.reset));
  }, [form]);

  const saveDraft = async (value: MedicationDraft) => {
    try {
      await Storage.setItem(draftKey, JSON.stringify(value));
    } catch {
      setDraftWarning(draftMessages.unavailable);
    }
  };
  const next = (value: MedicationDraft) => {
    if (!validation.checkStep(value, step)) return;
    void saveDraft(value);
    setStep((current) => Math.min(3, current + 1));
  };
  const goBack = () => {
    if (step === 0) setShowExit(true);
    else {
      validation.clear();
      setStep((value) => value - 1);
    }
  };
  const clearErrors = () => {
    validation.clear();
    createMutation.reset();
  };
  const submit = (value: MedicationDraft) => {
    const issue = validation.checkAll(value);
    if (issue) {
      setStep(issue.step);
      return;
    }
    void form.handleSubmit();
  };
  const fieldError =
    validation.fieldIssue?.step === step ? validation.fieldIssue.message : undefined;

  return (
    <Screen
      footer={
        <form.Subscribe selector={(state) => state.values}>
          {(value) =>
            step < 3 ? (
              <PillyButton
                label="Next"
                icon="arrow-forward"
                onPress={() => next(value)}
                fullWidth
              />
            ) : (
              <PillyButton
                label="Save"
                icon="checkmark"
                loading={createMutation.isPending}
                onPress={() => submit(value)}
                fullWidth
              />
            )
          }
        </form.Subscribe>
      }
    >
      <View style={styles.header}>
        <PillyIconButton icon="chevron-back" label="Back" onPress={goBack} />
        <View accessibilityLabel={`Step ${step + 1} of 4`} style={styles.progress}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={[styles.progressPart, item <= step && styles.progressActive]} />
          ))}
        </View>
      </View>
      {validation.bannerIssue ? (
        <PillyBanner kind="error" message={validation.bannerIssue.message} compact />
      ) : null}
      {createMutation.isError ? (
        <PillyBanner
          kind="error"
          title="Not saved"
          message={friendlySaveError(createMutation.error)}
          compact
        />
      ) : null}
      {draftWarning ? <PillyBanner kind="warning" message={draftWarning} compact /> : null}
      <form.Subscribe selector={(state) => state.values}>
        {(value) => (
          <>
            {step === 0 ? (
              <form.Field name="name">
                {(nameField) => (
                  <form.Field name="instructions">
                    {(instructionsField) => (
                      <NameStep
                        name={nameField.state.value}
                        instructions={instructionsField.state.value}
                        error={fieldError}
                        onNameChange={(text) => {
                          clearErrors();
                          nameField.handleChange(text);
                        }}
                        onInstructionsChange={instructionsField.handleChange}
                      />
                    )}
                  </form.Field>
                )}
              </form.Field>
            ) : null}
            {step === 1 ? (
              <form.Field name="selectedDays">
                {(field) => (
                  <DaysStep
                    selected={field.state.value}
                    error={fieldError}
                    onChange={(days) => {
                      clearErrors();
                      field.handleChange(days);
                    }}
                  />
                )}
              </form.Field>
            ) : null}
            {step === 2 ? (
              <form.Field name="time">
                {(field) => (
                  <TimeStep
                    value={field.state.value}
                    onChange={(time) => {
                      clearErrors();
                      field.handleChange(time);
                    }}
                  />
                )}
              </form.Field>
            ) : null}
            {step === 3 ? (
              <form.Field name="supply">
                {(supplyField) => (
                  <form.Field name="reminderEnabled">
                    {(reminderField) => (
                      <DetailsStep
                        supply={supplyField.state.value}
                        reminderEnabled={reminderField.state.value}
                        error={fieldError}
                        onSupplyChange={(text) => {
                          clearErrors();
                          supplyField.handleChange(text);
                        }}
                        onReminderChange={reminderField.handleChange}
                      />
                    )}
                  </form.Field>
                )}
              </form.Field>
            ) : null}
          </>
        )}
      </form.Subscribe>
      <PillyModal
        visible={showExit}
        title="Leave setup?"
        message="Your draft stays on this iPhone."
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        onConfirm={() => router.back()}
        onClose={() => setShowExit(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  progress: { flex: 1, flexDirection: 'row', gap: spacing.xs },
  progressPart: { flex: 1, height: 5, borderRadius: radii.round, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.brand },
});
