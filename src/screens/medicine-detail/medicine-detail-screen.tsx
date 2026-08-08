import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  EmptyState,
  PillyBanner,
  PillyButton,
  PillyCard,
  PillyIconButton,
  PillyModal,
  PillyNumberPicker,
  PillyText,
  Screen,
} from '@/design/components';
import { spacing } from '@/design/tokens';
import { formatTime } from '@/domain/schedule';
import { estimateSupply } from '@/domain/supply';
import { scheduleLocalReminders } from '@/platform/notifications';
import { useRepository } from '@/providers';

type Props = { medicationId: string };

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function scheduleDays(mask: number): string {
  if (mask === 127) return 'Every day';
  return dayNames.filter((_, index) => (mask & (1 << index)) !== 0).join(', ');
}

export function MedicineDetailScreen({ medicationId }: Props) {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const [supplyDraft, setSupplyDraft] = useState<{
    changed: boolean;
    value: number | null;
  }>({ changed: false, value: null });
  const [confirmArchive, setConfirmArchive] = useState(false);
  const query = useQuery({
    queryKey: ['medication', medicationId],
    queryFn: () => repository.getMedication(medicationId),
    networkMode: 'always',
  });
  const supply = supplyDraft.changed
    ? supplyDraft.value
    : (query.data?.medication.supplyCount ?? null);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['medication', medicationId] }),
      queryClient.invalidateQueries({ queryKey: ['medications'] }),
      queryClient.invalidateQueries({ queryKey: ['scheduled-doses'] }),
      queryClient.invalidateQueries({ queryKey: ['week'] }),
    ]);
  };
  const supplyMutation = useMutation({
    mutationFn: () => repository.setSupplyCount(medicationId, supply),
    onSuccess: async () => {
      setSupplyDraft({ changed: false, value: null });
      await refresh();
    },
  });
  const archiveMutation = useMutation({
    mutationFn: async (archived: boolean) => {
      await repository.setMedicationArchived(medicationId, archived);
      try {
        const reminderStatus = await scheduleLocalReminders(
          await repository.listReminderSchedules(),
        );
        await repository.setSetting(
          'reminderNotice',
          reminderStatus === 'denied' ? 'denied' : 'none',
        );
      } catch {
        await repository.setSetting('reminderNotice', 'failed');
      }
    },
    onSuccess: async () => {
      setConfirmArchive(false);
      await refresh();
    },
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
        <PillyBanner
          kind="error"
          title="Couldn’t load medicine"
          message="Your saved data is still here."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      </Screen>
    );
  }
  if (!query.data) {
    return (
      <Screen>
        <EmptyState icon="medkit-outline" title="Medicine not found" />
      </Screen>
    );
  }

  const { medication, schedules } = query.data;
  const supplyChanged = supplyDraft.changed && supply !== medication.supplyCount;
  const scheduledDays = schedules.reduce(
    (count, schedule) =>
      count +
      schedule.weekdayMask
        .toString(2)
        .split('')
        .filter((bit) => bit === '1').length,
    0,
  );
  const supplyEstimate = estimateSupply(medication.supplyCount, scheduledDays);
  return (
    <Screen>
      <View style={styles.header}>
        <PillyIconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <PillyText role="title" accessibilityRole="header">
            {medication.name}
          </PillyText>
          <PillyText role="caption" muted>
            {medication.archivedAt ? 'Archived' : 'Saved on this iPhone'}
          </PillyText>
        </View>
      </View>

      {medication.instructions ? (
        <PillyCard tone="peach" style={styles.card}>
          <PillyText role="label">Instruction</PillyText>
          <PillyText>{medication.instructions}</PillyText>
        </PillyCard>
      ) : null}

      {!medication.archivedAt ? (
        <PillyButton
          label="Edit medicine"
          icon="create-outline"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/medicine/[id]/edit', params: { id: medication.id } })
          }
          fullWidth
        />
      ) : null}

      <PillyButton
        label="Dose history"
        icon="time-outline"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/medicine/[id]/history', params: { id: medication.id } })
        }
        fullWidth
      />

      <View style={styles.section}>
        <PillyText role="headline">Schedule</PillyText>
        {schedules.map((schedule) => (
          <PillyCard key={schedule.id} padding="medium" style={styles.scheduleRow}>
            <View style={styles.scheduleCopy}>
              <PillyText role="headline">{formatTime(schedule.hour, schedule.minute)}</PillyText>
              <PillyText role="caption" muted>
                {scheduleDays(schedule.weekdayMask)}
              </PillyText>
            </View>
            <PillyText role="caption" muted>
              {schedule.reminderEnabled ? 'Reminder on' : 'Reminder off'}
            </PillyText>
          </PillyCard>
        ))}
      </View>

      <View style={styles.section}>
        <PillyNumberPicker
          label="Doses left"
          value={supply}
          onChange={(value) => setSupplyDraft({ changed: true, value })}
        />
        {supplyChanged ? (
          <PillyButton
            label="Save count"
            icon="save-outline"
            loading={supplyMutation.isPending}
            onPress={() => supplyMutation.mutate()}
            fullWidth
          />
        ) : null}
        {supplyMutation.isError ? (
          <PillyBanner kind="error" title="Count not saved" message="Try again." />
        ) : null}
        {supplyEstimate ? (
          <PillyBanner
            kind="info"
            title={`About ${supplyEstimate.daysLeft} ${supplyEstimate.daysLeft === 1 ? 'day' : 'days'} left`}
            message={`Estimated through ${new Intl.DateTimeFormat(undefined, {
              month: 'short',
              day: 'numeric',
            }).format(supplyEstimate.runsOutOn)}.`}
            compact
          />
        ) : null}
      </View>

      {archiveMutation.isError ? (
        <PillyBanner kind="error" title="Change not saved" message="Try again." />
      ) : null}
      {medication.archivedAt ? (
        <PillyButton
          label="Restore medicine"
          icon="refresh"
          variant="secondary"
          loading={archiveMutation.isPending}
          onPress={() => archiveMutation.mutate(false)}
          fullWidth
        />
      ) : (
        <PillyButton
          label="Archive medicine"
          icon="archive-outline"
          variant="quiet"
          onPress={() => setConfirmArchive(true)}
          fullWidth
        />
      )}

      <PillyModal
        visible={confirmArchive}
        title="Archive this medicine?"
        message="It will leave Today and Week. Its past records stay saved."
        confirmLabel="Archive"
        destructive
        onConfirm={() => archiveMutation.mutate(true)}
        onClose={() => setConfirmArchive(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.md },
  card: { gap: spacing.sm },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scheduleCopy: { flex: 1, gap: spacing.xs },
});
