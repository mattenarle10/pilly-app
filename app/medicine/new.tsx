import { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { useForm, useStore } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import Storage from 'expo-sqlite/kv-store';

import { PillyBanner, PillyModal } from '@/ui/components';
import { useMedicationValidation, useRepository } from '@/hooks';
import {
  AppearanceStep,
  assertMedicationDraft,
  defaults,
  DetailsStep,
  draftKey,
  draftMessages,
  draftSchema,
  friendlySaveError,
  MedicineFormShell,
  NameStep,
  ScheduleStep,
  scheduleConfigurationFromDraft,
  supplyValue,
  type MedicationDraft,
} from '@/features/medicine-form';
import { scheduleLocalReminders } from '@/services/notifications';

export default function NewMedicationRoute() {
  const navigation = useNavigation();
  const repository = useRepository();
  const queryClient = useQueryClient();
  const validation = useMedicationValidation();
  const formScroll = useRef<ScrollView>(null);
  const [created, setCreated] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
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
      setCreated(true);
    },
  });
  const values = useStore(form.store, (state) => state.values);

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

  usePreventRemove(!created, ({ data }) => {
    setPendingNavigation(() => () => navigation.dispatch(data.action));
    setShowExit(true);
  });

  useEffect(() => {
    if (created) router.replace('/(tabs)/today');
  }, [created]);

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
    if (issue) {
      formScroll.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    void form.handleSubmit();
  };
  const fieldError = validation.fieldIssue;

  return (
    <MedicineFormShell
      title="Add medicine"
      actionLabel="Add"
      actionLoading={createMutation.isPending}
      onAction={() => submit(values)}
      scrollRef={formScroll}
      modal={
        <PillyModal
          visible={showExit}
          title="Leave setup?"
          message="Your draft stays on this iPhone."
          confirmLabel="Leave"
          cancelLabel="Keep editing"
          onConfirm={() => {
            if (!pendingNavigation) return;
            const leave = pendingNavigation;
            void saveDraft(form.state.values).finally(() => {
              setShowExit(false);
              setPendingNavigation(null);
              leave();
            });
          }}
          onClose={() => {
            setShowExit(false);
            setPendingNavigation(null);
          }}
        />
      }
    >
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
      <NameStep
        name={values.name}
        instructions={values.instructions}
        error={fieldError?.field === 'name' ? fieldError.message : undefined}
        onNameChange={(text) => {
          clearErrors();
          form.setFieldValue('name', text);
        }}
        onInstructionsChange={(text) => form.setFieldValue('instructions', text)}
      />
      <AppearanceStep
        shape={values.appearanceShape}
        size={values.appearanceSize}
        tone={values.appearanceTone}
        secondaryTone={values.appearanceSecondaryTone}
        onShapeChange={(shape) => form.setFieldValue('appearanceShape', shape)}
        onSizeChange={(size) => form.setFieldValue('appearanceSize', size)}
        onToneChange={(tone) => form.setFieldValue('appearanceTone', tone)}
        onSecondaryToneChange={(tone) => form.setFieldValue('appearanceSecondaryTone', tone)}
      />
      <ScheduleStep
        selectedDays={values.selectedDays}
        schedules={values.schedules}
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
        supply={values.supply}
        error={fieldError?.field === 'supply' ? fieldError.message : undefined}
        onSupplyChange={(supply) => {
          clearErrors();
          form.setFieldValue('supply', supply);
        }}
      />
    </MedicineFormShell>
  );
}
