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
import { useRepository } from '@/hooks';
import {
  AppearanceStep,
  assertMedicationDraft,
  defaults,
  DetailsStep,
  draftKey,
  draftMessages,
  draftSchema,
  friendlySaveError,
  NameStep,
  ScheduleStep,
  scheduleConfigurationFromDraft,
  supplyValue,
  type MedicationDraft,
  useMedicationValidation,
} from '@/medicine-form';
import { scheduleLocalReminders } from '@/platform/notifications';

export default function NewMedicationRoute() {
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
        appearanceShape: value.appearanceShape,
        appearanceSize: value.appearanceSize,
        appearanceTone: value.appearanceTone,
        appearanceSecondaryTone: value.appearanceSecondaryTone,
        schedules: scheduleConfigurationFromDraft(value),
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
    <Screen>
      <View style={styles.navigation}>
        <PillyIconButton icon="back" label="Back" onPress={() => setShowExit(true)} />
        <form.Subscribe selector={(state) => state.values}>
          {(value) => (
            <PillyButton
              label="Add"
              variant="quiet"
              tone="brand"
              size="compact"
              loading={createMutation.isPending}
              onPress={() => submit(value)}
            />
          )}
        </form.Subscribe>
      </View>
      <PillyText role="large-title" accessibilityRole="header">
        Add medicine
      </PillyText>
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
            <AppearanceStep
              shape={value.appearanceShape}
              size={value.appearanceSize}
              tone={value.appearanceTone}
              secondaryTone={value.appearanceSecondaryTone}
              onShapeChange={(shape) => form.setFieldValue('appearanceShape', shape)}
              onSizeChange={(size) => form.setFieldValue('appearanceSize', size)}
              onToneChange={(tone) => form.setFieldValue('appearanceTone', tone)}
              onSecondaryToneChange={(tone) => form.setFieldValue('appearanceSecondaryTone', tone)}
            />
            <ScheduleStep
              selectedDays={value.selectedDays}
              schedules={value.schedules}
              error={
                fieldError?.field === 'selectedDays' || fieldError?.field === 'schedules'
                  ? fieldError.message
                  : undefined
              }
              onDaysChange={(days) => {
                clearErrors();
                form.setFieldValue('selectedDays', days);
              }}
              onSchedulesChange={(schedules) => {
                clearErrors();
                form.setFieldValue('schedules', schedules);
              }}
            />
            <DetailsStep
              supply={value.supply}
              error={fieldError?.field === 'supply' ? fieldError.message : undefined}
              onSupplyChange={(supply) => {
                clearErrors();
                form.setFieldValue('supply', supply);
              }}
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
  navigation: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
