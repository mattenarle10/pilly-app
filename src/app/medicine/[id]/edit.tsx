import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useForm, useSelector, type AnyFormApi } from '@tanstack/react-form';

import type { MedicationDetail } from '@/models/medication';
import { MedicineTypeStep } from '@/ui/components/medicine-appearance-field';
import { MedicinePhotoField } from '@/ui/components/medicine-photo-field';
import { DetailsStep, NameStep, ScheduleStep } from '@/ui/components/medicine-form-sections';
import { MedicineFormShell } from '@/ui/components/medicine-form-shell';
import { EmptyState } from '@/ui/components/empty-state';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyConfirmationSheet } from '@/ui/components/pilly-confirmation-sheet';
import { Screen } from '@/ui/components/screen';
import { schedulesMatch } from '@/models/schedule';
import { useEditMedicine } from '@/hooks/use-edit-medicine';
import { useMedicinePhoto } from '@/hooks/use-medicine-photo';
import {
  medicationDraftsMatch,
  scheduleConfigurationFromDraft,
  scheduleDraftsFromSchedules,
  selectedDaysFromMask,
  validateMedicationDraft,
  type MedicationDraft,
} from '@/models/medicine-form';
import { friendlySaveError } from '@/models/medicine-form-errors';

export default function EditMedicineRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const edit = useEditMedicine(id);
  const photo = useMedicinePhoto(id);

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

  return (
    <EditMedicineForm detail={edit.query.data} saveMutation={edit.saveMutation} photo={photo} />
  );
}

function EditMedicineForm({
  detail,
  saveMutation,
  photo,
}: {
  detail: MedicationDetail;
  saveMutation: ReturnType<typeof useEditMedicine>['saveMutation'];
  photo: ReturnType<typeof useMedicinePhoto>;
}) {
  const navigation = useNavigation();
  const schedule = detail.schedules[0];
  const [saved, setSaved] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const initialDraft = useMemo(
    () =>
      ({
        name: detail.medication.name,
        instructions: detail.medication.instructions,
        selectedDays: schedule ? selectedDaysFromMask(schedule.weekdayMask) : [],
        schedules: scheduleDraftsFromSchedules(detail.schedules),
        supply: detail.medication.supplyCount === null ? '' : `${detail.medication.supplyCount}`,
        form: detail.medication.form,
        tabletShape: detail.medication.tabletShape,
        appearanceSize: detail.medication.appearanceSize,
        appearanceColor: detail.medication.appearanceColor,
        appearanceSecondaryColor: detail.medication.appearanceSecondaryColor,
      }) satisfies MedicationDraft,
    [detail, schedule],
  );
  const form = useForm({
    defaultValues: initialDraft,
    onSubmit: ({ value }) => {
      saveMutation.mutate(value, {
        onSuccess: () => setSaved(true),
      });
    },
  });
  const isDirty = useSelector(
    form.store,
    (state) => !medicationDraftsMatch(initialDraft, state.values),
  );
  const issue = useSelector(form.store, (state) => validateMedicationDraft(state.values), {
    compare: issuesMatch,
  });

  usePreventRemove(isDirty && !saved, ({ data }) => {
    setPendingNavigation(() => () => navigation.dispatch(data.action));
  });

  useEffect(() => {
    if (saved) router.back();
  }, [saved]);

  const resetSaveMutation = saveMutation.reset;
  const setFieldValue = useCallback<SetMedicationFieldValue>(
    (field, value) => {
      resetSaveMutation();
      form.setFieldValue(field, value as never);
    },
    [form, resetSaveMutation],
  );

  return (
    <MedicineFormShell
      actionLabel="Done"
      actionLoading={saveMutation.isPending}
      actionDisabled={!isDirty || issue !== null}
      onAction={() => void form.handleSubmit()}
      modal={
        <PillyConfirmationSheet
          visible={pendingNavigation !== null}
          title="Discard changes?"
          message="Your edits haven’t been saved."
          confirmLabel="Discard"
          destructive
          onConfirm={() => {
            if (!pendingNavigation) return;
            const leave = pendingNavigation;
            setPendingNavigation(null);
            leave();
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
      <EditNameSection form={form} issue={issue} setFieldValue={setFieldValue} />
      <EditAppearanceSection form={form} setFieldValue={setFieldValue} />
      {photo.available ? (
        <MedicinePhotoField
          uri={photo.uri}
          busy={photo.isBusy}
          error={photo.error}
          onSelect={(source) => void photo.select(source)}
          onRemove={() => void photo.remove()}
          onRetry={
            photo.errorKind === 'transfer' || photo.errorKind === 'restore'
              ? () => void photo.retry()
              : undefined
          }
        />
      ) : null}
      <EditScheduleSection form={form} issue={issue} setFieldValue={setFieldValue} />
      <EditDetailsSection form={form} issue={issue} setFieldValue={setFieldValue} />
      <ScheduleChangedBanner form={form} initialSchedules={detail.schedules} />
    </MedicineFormShell>
  );
}

type SetMedicationFieldValue = <Field extends keyof MedicationDraft>(
  field: Field,
  value: MedicationDraft[Field],
) => void;

type FormSectionProps = {
  form: AnyFormApi;
  setFieldValue: SetMedicationFieldValue;
};

const EditNameSection = memo(function EditNameSection({
  form,
  issue,
  setFieldValue,
}: FormSectionProps & { issue: ReturnType<typeof validateMedicationDraft> }) {
  const name = useDraftValue(form, (draft) => draft.name);
  const instructions = useDraftValue(form, (draft) => draft.instructions);

  return (
    <NameStep
      nameTestID="medicine-name"
      name={name}
      instructions={instructions}
      error={issue?.field === 'name' ? issue.message : undefined}
      onNameChange={(text) => setFieldValue('name', text)}
      onInstructionsChange={(text) => setFieldValue('instructions', text)}
    />
  );
});

const EditAppearanceSection = memo(function EditAppearanceSection({
  form,
  setFieldValue,
}: FormSectionProps) {
  const medicineForm = useDraftValue(form, (draft) => draft.form);
  const tabletShape = useDraftValue(form, (draft) => draft.tabletShape);
  const size = useDraftValue(form, (draft) => draft.appearanceSize);
  const color = useDraftValue(form, (draft) => draft.appearanceColor);
  const secondaryColor = useDraftValue(form, (draft) => draft.appearanceSecondaryColor);

  return (
    <MedicineTypeStep
      form={medicineForm}
      tabletShape={tabletShape}
      size={size}
      color={color}
      secondaryColor={secondaryColor}
      onFormChange={(value) => setFieldValue('form', value)}
      onTabletShapeChange={(value) => setFieldValue('tabletShape', value)}
      onColorChange={(value) => setFieldValue('appearanceColor', value)}
      onSecondaryColorChange={(value) => setFieldValue('appearanceSecondaryColor', value)}
    />
  );
});

const EditScheduleSection = memo(function EditScheduleSection({
  form,
  issue,
  setFieldValue,
}: FormSectionProps & { issue: ReturnType<typeof validateMedicationDraft> }) {
  const selectedDays = useDraftValue(form, (draft) => draft.selectedDays);
  const schedules = useDraftValue(form, (draft) => draft.schedules);

  return (
    <ScheduleStep
      selectedDays={selectedDays}
      schedules={schedules}
      error={
        issue?.field === 'selectedDays' || issue?.field === 'schedules' ? issue.message : undefined
      }
      onDaysChange={(value) => setFieldValue('selectedDays', value)}
      onSchedulesChange={(value) => setFieldValue('schedules', value)}
    />
  );
});

const EditDetailsSection = memo(function EditDetailsSection({
  form,
  issue,
  setFieldValue,
}: FormSectionProps & { issue: ReturnType<typeof validateMedicationDraft> }) {
  const supply = useDraftValue(form, (draft) => draft.supply);

  return (
    <DetailsStep
      supply={supply}
      error={issue?.field === 'supply' ? issue.message : undefined}
      onSupplyChange={(value) => setFieldValue('supply', value)}
    />
  );
});

const ScheduleChangedBanner = memo(function ScheduleChangedBanner({
  form,
  initialSchedules,
}: {
  form: AnyFormApi;
  initialSchedules: MedicationDetail['schedules'];
}) {
  const schedulesStillMatch = useSelector(form.store, (state) =>
    schedulesMatch(
      initialSchedules,
      scheduleConfigurationFromDraft(state.values as MedicationDraft),
    ),
  );

  return schedulesStillMatch ? null : (
    <PillyBanner
      kind="info"
      message="Schedule changes start tomorrow. Past records stay unchanged."
      compact
    />
  );
});

function useDraftValue<Value>(form: AnyFormApi, select: (draft: MedicationDraft) => Value): Value {
  return useSelector(form.store, (state) => select(state.values as MedicationDraft));
}

function issuesMatch(
  previous: ReturnType<typeof validateMedicationDraft>,
  next: ReturnType<typeof validateMedicationDraft>,
): boolean {
  return (
    previous?.field === next?.field &&
    previous?.message === next?.message &&
    previous?.step === next?.step
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
