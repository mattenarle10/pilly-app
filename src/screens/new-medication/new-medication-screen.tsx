import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';

import {
  PillyBanner,
  PillyButton,
  PillyIconButton,
  PillyModal,
  PillyText,
  Screen,
} from '@/design/components';
import { spacing } from '@/design/tokens';
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
  const clearErrors = () => {
    validation.clear();
    createMutation.reset();
  };
  const submit = (value: MedicationDraft) => {
    const issue = validation.checkAll(value);
    if (issue) return;
    void form.handleSubmit();
  };
  const fieldError = validation.fieldIssue;

  return (
    <Screen
      footer={
        <form.Subscribe selector={(state) => state.values}>
          {(value) => (
            <PillyButton
              label="Add medicine"
              icon="checkmark"
              loading={createMutation.isPending}
              onPress={() => submit(value)}
              fullWidth
            />
          )}
        </form.Subscribe>
      }
    >
      <View style={styles.header}>
        <PillyIconButton icon="chevron-back" label="Back" onPress={() => setShowExit(true)} />
        <PillyText role="title" accessibilityRole="header">
          Add medicine
        </PillyText>
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
            <NameStep
              name={value.name}
              instructions={value.instructions}
              error={fieldError?.field === 'name' ? fieldError.message : undefined}
              onNameChange={(text) => {
                clearErrors();
                form.setFieldValue('name', text);
              }}
              onInstructionsChange={(text) => form.setFieldValue('instructions', text)}
            />
            <DaysStep
              selected={value.selectedDays}
              error={fieldError?.field === 'selectedDays' ? fieldError.message : undefined}
              onChange={(days) => {
                clearErrors();
                form.setFieldValue('selectedDays', days);
              }}
            />
            <TimeStep
              value={value.time}
              onChange={(time) => {
                clearErrors();
                form.setFieldValue('time', time);
              }}
            />
            <DetailsStep
              supply={value.supply}
              reminderEnabled={value.reminderEnabled}
              error={fieldError?.field === 'supply' ? fieldError.message : undefined}
              onSupplyChange={(supply) => {
                clearErrors();
                form.setFieldValue('supply', supply);
              }}
              onReminderChange={(enabled) => form.setFieldValue('reminderEnabled', enabled)}
            />
          </>
        )}
      </form.Subscribe>
      <PillyModal
        visible={showExit}
        title="Leave setup?"
        message="Your draft stays on this iPhone."
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        onConfirm={() => {
          void saveDraft(form.state.values).finally(() => router.back());
        }}
        onClose={() => setShowExit(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
