import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  EmptyState,
  PillyBanner,
  PillyCard,
  PillyIconButton,
  PillyIconTile,
  PillyModal,
  PillyNumberPicker,
  PillyText,
  Screen,
} from '@/design/components';
import { PillyIcon, type PillyIconName } from '@/design/icons';
import { colors, radii, spacing } from '@/design/tokens';
import { formatTime } from '@/domain/schedule';
import { estimateSupply } from '@/domain/supply';
import { scheduleLocalReminders } from '@/platform/notifications';
import { useRepository } from '@/hooks';

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
  const [confirmDelete, setConfirmDelete] = useState(false);
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
  const syncReminders = async () => {
    try {
      const reminderStatus = await scheduleLocalReminders(await repository.listReminderSchedules());
      await repository.setSetting(
        'reminderNotice',
        reminderStatus === 'denied' ? 'denied' : 'none',
      );
    } catch {
      await repository.setSetting('reminderNotice', 'failed');
    }
  };
  const archiveMutation = useMutation({
    mutationFn: async (archived: boolean) => {
      await repository.setMedicationArchived(medicationId, archived);
      await syncReminders();
    },
    onSuccess: async () => {
      setConfirmArchive(false);
      await refresh();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await repository.deleteMedication(medicationId);
      await syncReminders();
    },
    onSuccess: async () => {
      setConfirmDelete(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['medications'] }),
        queryClient.invalidateQueries({ queryKey: ['scheduled-doses'] }),
        queryClient.invalidateQueries({ queryKey: ['week'] }),
        queryClient.invalidateQueries({ queryKey: ['organizer-week'] }),
      ]);
      router.replace('/(tabs)/medicines');
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
        <EmptyState icon="medicine" title="Medicine not found" />
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
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <PillyIconButton icon="back" label="Back" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <PillyText role="title" accessibilityRole="header">
            {medication.name}
          </PillyText>
          <PillyText role="caption" muted>
            {medication.archivedAt ? 'Archived' : 'Saved on this iPhone'}
          </PillyText>
        </View>
        {!medication.archivedAt ? (
          <PillyIconButton
            icon="edit"
            label="Edit medicine"
            onPress={() =>
              router.push({ pathname: '/medicine/[id]/edit', params: { id: medication.id } })
            }
          />
        ) : null}
      </View>

      {medication.instructions ? (
        <PillyCard tone="peach" padding="medium" style={styles.instructionCard}>
          <PillyIconTile icon="document" tone="peach" />
          <View style={styles.instructionCopy}>
            <PillyText role="caption" muted>
              Instruction
            </PillyText>
            <PillyText>{medication.instructions}</PillyText>
          </View>
        </PillyCard>
      ) : null}

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
          action={{
            icon: 'save',
            label: 'Save count',
            disabled: !supplyChanged || supplyMutation.isPending,
            onPress: () => supplyMutation.mutate(),
          }}
        />
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

      {archiveMutation.isError || deleteMutation.isError ? (
        <PillyBanner kind="error" title="Change not saved" message="Try again." />
      ) : null}
      <View style={styles.section}>
        <PillyText role="headline">Manage</PillyText>
        <DetailAction
          icon="time"
          label="Dose history"
          message="View recorded changes."
          onPress={() =>
            router.push({ pathname: '/medicine/[id]/history', params: { id: medication.id } })
          }
        />
        <DetailAction
          icon={medication.archivedAt ? 'refresh' : 'archive'}
          label={medication.archivedAt ? 'Restore medicine' : 'Archive medicine'}
          message={
            medication.archivedAt ? 'Return it to your schedule.' : 'Hide it from Today and Week.'
          }
          disabled={archiveMutation.isPending}
          onPress={() =>
            medication.archivedAt ? archiveMutation.mutate(false) : setConfirmArchive(true)
          }
        />
        <DetailAction
          icon="delete"
          label="Delete medicine"
          message="Permanently remove its history."
          danger
          disabled={deleteMutation.isPending}
          onPress={() => setConfirmDelete(true)}
        />
      </View>

      <PillyModal
        visible={confirmArchive}
        title="Archive this medicine?"
        message="It will leave Today and Week. Its past records stay saved."
        confirmLabel="Archive"
        destructive
        onConfirm={() => archiveMutation.mutate(true)}
        onClose={() => setConfirmArchive(false)}
      />
      <PillyModal
        visible={confirmDelete}
        title="Delete this medicine?"
        message="Its schedules, dose records, and supply history will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

function DetailAction({
  icon,
  label,
  message,
  danger = false,
  disabled = false,
  onPress,
}: {
  icon: PillyIconName;
  label: string;
  message: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        danger && styles.dangerRow,
        pressed && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.actionIcon, danger && styles.dangerIcon]}>
            <PillyIcon
              name={icon}
              size={20}
              color={danger ? colors.danger : colors.brand}
              active={pressed}
            />
          </View>
          <View style={styles.actionCopy}>
            <PillyText role="headline" style={danger ? styles.dangerText : undefined}>
              {label}
            </PillyText>
            <PillyText role="caption" muted>
              {message}
            </PillyText>
          </View>
          <PillyIcon name="next" size={18} color={colors.textSecondary} active={pressed} />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.md },
  instructionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  instructionCopy: { flex: 1, gap: spacing.xs },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scheduleCopy: { flex: 1, gap: spacing.xs },
  actionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
  },
  actionPressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  actionDisabled: { opacity: 0.42 },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  actionCopy: { flex: 1, gap: spacing.xs },
  dangerRow: { backgroundColor: colors.dangerSoft },
  dangerIcon: { backgroundColor: colors.surface },
  dangerText: { color: colors.danger },
});
