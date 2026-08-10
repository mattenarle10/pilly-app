import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useForm, useStore } from '@tanstack/react-form';

import type { MedicationDetail } from '@/data/repositories';
import { EmptyState, PillyBanner, PillyModal, Screen } from '@/design/components';
import { schedulesMatch } from '@/domain/schedule';
import { useEditMedicine } from '@/hooks';
import {
  AppearanceStep,
  DetailsStep,
  friendlySaveError,
  MedicineFormShell,
  medicationDraftsMatch,
  NameStep,
  ScheduleStep,
  scheduleConfigurationFromDraft,
  scheduleDraftsFromSchedules,
  selectedDaysFromMask,
  validateMedicationDraft,
  type MedicationDraft,
} from '@/medicine-form';

export default function EditMedicineRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const edit = useEditMedicine(id);

  if (edit.query.isLoading) return <EditState message="Loading medicine…" />;
  if (edit.query.isError)
    return (
      <EditState
        kind="error"
        message="Couldn’t load medicine"
        onRetry={() => void edit.query.refetch()}
      />
    );
  if (!edit.query.data) return <EditState kind="missing" message="Medicine not found" />;

  return <EditMedicineForm detail={edit.query.data} saveMutation={edit.saveMutation} />;
}

function EditMedicineForm({
  detail,
  saveMutation,
}: {
  detail: MedicationDetail;
  saveMutation: ReturnType<typeof useEditMedicine>['saveMutation'];
}) {
  const navigation = useNavigation();
  const schedule = detail.schedules[0];
  const allowLeave = useRef(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const initialDraft = useMemo(
    () =>
      ({
        name: detail.medication.name,
        instructions: detail.medication.instructions,
        selectedDays: schedule ? selectedDaysFromMask(schedule.weekdayMask) : [],
        schedules: scheduleDraftsFromSchedules(detail.schedules),
        supply: detail.medication.supplyCount === null ? '' : `${detail.medication.supplyCount}`,
        appearanceShape: detail.medication.appearanceShape,
        appearanceSize: detail.medication.appearanceSize,
        appearanceTone: detail.medication.appearanceTone,
        appearanceSecondaryTone: detail.medication.appearanceSecondaryTone,
      }) satisfies MedicationDraft,
    [detail, schedule],
  );
  const form = useForm({
    defaultValues: initialDraft,
    onSubmit: ({ value }) => {
      saveMutation.mutate(value, {
        onSuccess: () => {
          allowLeave.current = true;
          router.back();
        },
      });
    },
  });
  const values = useStore(form.store, (state) => state.values);
  const isDirty = !medicationDraftsMatch(initialDraft, values);
  const issue = validateMedicationDraft(values);
  const scheduleChanged = !schedulesMatch(detail.schedules, scheduleConfigurationFromDraft(values));

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!isDirty || allowLeave.current) return;
        event.preventDefault();
        setPendingNavigation(() => () => navigation.dispatch(event.data.action));
      }),
    [isDirty, navigation],
  );

  const setFieldValue = <Field extends keyof MedicationDraft>(
    field: Field,
    value: MedicationDraft[Field],
  ) => {
    saveMutation.reset();
    form.setFieldValue(field, value as never);
  };

  return (
    <MedicineFormShell
      title="Edit medicine"
      actionLabel="Done"
      actionLoading={saveMutation.isPending}
      actionDisabled={!isDirty || issue !== null}
      onAction={() => void form.handleSubmit()}
      modal={
        <PillyModal
          visible={pendingNavigation !== null}
          title="Discard changes?"
          message="Your edits haven’t been saved."
          confirmLabel="Discard"
          destructive
          onConfirm={() => {
            if (!pendingNavigation) return;
            allowLeave.current = true;
            setPendingNavigation(null);
            pendingNavigation();
          }}
          onClose={() => setPendingNavigation(null)}
        />
      }
    >
      {saveMutation.isError ? (
        <PillyBanner
          kind="error"
          title="Changes not saved"
          message={friendlySaveError(saveMutation.error)}
          compact
        />
      ) : null}
      <NameStep
        autoFocus={false}
        name={values.name}
        instructions={values.instructions}
        error={issue?.field === 'name' ? issue.message : undefined}
        onNameChange={(text) => setFieldValue('name', text)}
        onInstructionsChange={(text) => setFieldValue('instructions', text)}
      />
      <AppearanceStep
        shape={values.appearanceShape}
        size={values.appearanceSize}
        tone={values.appearanceTone}
        secondaryTone={values.appearanceSecondaryTone}
        onShapeChange={(shape) => setFieldValue('appearanceShape', shape)}
        onSizeChange={(size) => setFieldValue('appearanceSize', size)}
        onToneChange={(tone) => setFieldValue('appearanceTone', tone)}
        onSecondaryToneChange={(tone) => setFieldValue('appearanceSecondaryTone', tone)}
      />
      <ScheduleStep
        selectedDays={values.selectedDays}
        schedules={values.schedules}
        error={
          issue?.field === 'selectedDays' || issue?.field === 'schedules'
            ? issue.message
            : undefined
        }
        onDaysChange={(days) => setFieldValue('selectedDays', days)}
        onSchedulesChange={(schedules) => setFieldValue('schedules', schedules)}
      />
      <DetailsStep
        supply={values.supply}
        error={issue?.field === 'supply' ? issue.message : undefined}
        onSupplyChange={(supply) => setFieldValue('supply', supply)}
      />
      {scheduleChanged ? (
        <PillyBanner
          kind="info"
          message="Schedule changes start tomorrow. Past records stay unchanged."
          compact
        />
      ) : null}
    </MedicineFormShell>
  );
}

function EditState({
  message,
  kind = 'loading',
  onRetry,
}: {
  message: string;
  kind?: 'loading' | 'error' | 'missing';
  onRetry?: () => void;
}) {
  return (
    <Screen>
      {kind === 'missing' ? (
        <EmptyState icon="medicine" title={message} />
      ) : (
        <PillyBanner
          kind={kind === 'error' ? 'error' : 'info'}
          message={message}
          actionLabel={onRetry ? 'Try again' : undefined}
          onAction={onRetry}
        />
      )}
    </Screen>
  );
}
