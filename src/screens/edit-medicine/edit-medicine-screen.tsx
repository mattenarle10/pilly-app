import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MedicationDetail } from '@/data/repositories';
import {
  EmptyState,
  PillyBanner,
  PillyButton,
  PillyIconButton,
  PillyText,
  Screen,
} from '@/design/components';
import { spacing } from '@/design/tokens';
import { weekdayMask } from '@/domain/schedule';
import { scheduleLocalReminders } from '@/platform/notifications';
import { useRepository } from '@/hooks';
import { friendlySaveError } from '@/screens/new-medication/new-medication-errors';
import {
  assertMedicationDraft,
  parseTime,
  supplyValue,
  type MedicationDraft,
} from '@/screens/new-medication/new-medication-form';
import {
  DaysStep,
  DetailsStep,
  NameStep,
  TimeStep,
} from '@/screens/new-medication/new-medication-steps';

type Props = { medicationId: string };

function selectedDays(mask: number): number[] {
  return Array.from({ length: 7 }, (_, index) => index + 1).filter(
    (day) => (mask & (1 << (day - 1))) !== 0,
  );
}

function EditMedicineForm({ detail }: { detail: MedicationDetail }) {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const schedule = detail.schedules[0];
  const form = useForm({
    defaultValues: {
      name: detail.medication.name,
      instructions: detail.medication.instructions,
      selectedDays: schedule ? selectedDays(schedule.weekdayMask) : [],
      time: schedule
        ? `${schedule.hour}`.padStart(2, '0') + ':' + `${schedule.minute}`.padStart(2, '0')
        : '09:00',
      supply: detail.medication.supplyCount === null ? '' : `${detail.medication.supplyCount}`,
      reminderEnabled: schedule?.reminderEnabled ?? false,
    } satisfies MedicationDraft,
    onSubmit: ({ value }) => saveMutation.mutate(value),
  });
  const saveMutation = useMutation({
    mutationFn: async (value: MedicationDraft) => {
      assertMedicationDraft(value);
      await repository.updateMedication(detail.medication.id, {
        name: value.name.trim(),
        instructions: value.instructions.trim(),
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
      const nextSupply = supplyValue(value.supply);
      if (nextSupply !== detail.medication.supplyCount) {
        await repository.setSupplyCount(detail.medication.id, nextSupply);
      }
      const reminderStatus = await scheduleLocalReminders(await repository.listReminderSchedules());
      await repository.setSetting(
        'reminderNotice',
        reminderStatus === 'denied' ? 'denied' : 'none',
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      router.back();
    },
  });

  return (
    <Screen
      footer={
        <PillyButton
          label="Save changes"
          icon="done"
          loading={saveMutation.isPending}
          onPress={() => void form.handleSubmit()}
          fullWidth
        />
      }
    >
      <View style={styles.header}>
        <PillyIconButton icon="back" label="Back" onPress={() => router.back()} />
        <PillyText role="title" accessibilityRole="header">
          Edit medicine
        </PillyText>
      </View>
      {saveMutation.isError ? (
        <PillyBanner
          kind="error"
          title="Changes not saved"
          message={friendlySaveError(saveMutation.error)}
          compact
        />
      ) : null}
      <form.Subscribe selector={(state) => state.values}>
        {(value) => (
          <>
            <NameStep
              autoFocus={false}
              name={value.name}
              instructions={value.instructions}
              onNameChange={(text) => form.setFieldValue('name', text)}
              onInstructionsChange={(text) => form.setFieldValue('instructions', text)}
            />
            <DaysStep
              selected={value.selectedDays}
              onChange={(days) => form.setFieldValue('selectedDays', days)}
            />
            <TimeStep value={value.time} onChange={(time) => form.setFieldValue('time', time)} />
            <DetailsStep
              supply={value.supply}
              reminderEnabled={value.reminderEnabled}
              onSupplyChange={(supply) => form.setFieldValue('supply', supply)}
              onReminderChange={(enabled) => form.setFieldValue('reminderEnabled', enabled)}
            />
            <PillyBanner
              kind="info"
              message="Schedule changes start tomorrow. Past records stay unchanged."
              compact
            />
          </>
        )}
      </form.Subscribe>
    </Screen>
  );
}

export function EditMedicineScreen({ medicationId }: Props) {
  const repository = useRepository();
  const query = useQuery({
    queryKey: ['medication', medicationId],
    queryFn: () => repository.getMedication(medicationId),
    networkMode: 'always',
  });
  if (query.isLoading) {
    return (
      <Screen>
        <PillyBanner message="Loading medicine…" />
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <Screen>
        <PillyBanner kind="error" title="Couldn’t load medicine" message="Try again." />
      </Screen>
    );
  }
  if (!query.data) {
    return (
      <Screen>
        <EmptyState icon="medicine" title="Medicine not found" />
      </Screen>
    );
  }
  return <EditMedicineForm key={query.data.medication.updatedAt} detail={query.data} />;
}

const styles = StyleSheet.create({
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
