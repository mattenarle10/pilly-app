import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useForm, useStore } from '@tanstack/react-form';

import type { MedicationDetail } from '@/models/medication';
import { AppearanceStep } from '@/ui/components/medicine-appearance-field';
import { DetailsStep, NameStep, ScheduleStep } from '@/ui/components/medicine-form-sections';
import { MedicineFormShell } from '@/ui/components/medicine-form-shell';
import { EmptyState } from '@/ui/components/empty-state';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyModal } from '@/ui/components/pilly-modal';
import { Screen } from '@/ui/components/screen';
import { schedulesMatch } from '@/models/schedule';
import { useEditMedicine } from '@/hooks/use-edit-medicine';
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
        appearanceShape: detail.medication.appearanceShape,
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
  const values = useStore(form.store, (state) => state.values);
  const isDirty = !medicationDraftsMatch(initialDraft, values);
  const issue = validateMedicationDraft(values);
  const scheduleChanged = !schedulesMatch(detail.schedules, scheduleConfigurationFromDraft(values));

  usePreventRemove(isDirty && !saved, ({ data }) => {
    setPendingNavigation(() => () => navigation.dispatch(data.action));
  });

  useEffect(() => {
    if (saved) router.back();
  }, [saved]);

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
      <NameStep
        autoFocus={false}
        nameTestID="medicine-name"
        name={values.name}
        instructions={values.instructions}
        error={issue?.field === 'name' ? issue.message : undefined}
        onNameChange={(text) => setFieldValue('name', text)}
        onInstructionsChange={(text) => setFieldValue('instructions', text)}
      />
      <AppearanceStep
        shape={values.appearanceShape}
        size={values.appearanceSize}
        color={values.appearanceColor}
        secondaryColor={values.appearanceSecondaryColor}
        onShapeChange={(shape) => setFieldValue('appearanceShape', shape)}
        onSizeChange={(size) => setFieldValue('appearanceSize', size)}
        onColorChange={(color) => setFieldValue('appearanceColor', color)}
        onSecondaryColorChange={(color) => setFieldValue('appearanceSecondaryColor', color)}
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
