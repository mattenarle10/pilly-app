import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import {
  EmptyState,
  MedicationAppearance,
  PillyBanner,
  PillyCard,
  PillyIconButton,
  PillyModal,
  PillyNumberPicker,
  PillyText,
  PillyToggle,
  Screen,
} from '@/ui/components';
import { PillyIcon } from '@/ui/icons';
import { colors, spacing } from '@/ui/tokens';
import { formatTime } from '@/models/schedule';
import { estimateSupply } from '@/models/supply';
import { useMedicineDetail } from '@/hooks';

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const scheduleDays = (mask: number) =>
  mask === 127
    ? 'Every day'
    : dayNames.filter((_, index) => (mask & (1 << index)) !== 0).join(', ');
const countDays = (mask: number) =>
  mask
    .toString(2)
    .split('')
    .filter((bit) => bit === '1').length;
const enter = (delay: number) =>
  FadeInDown.delay(delay).duration(180).reduceMotion(ReduceMotion.System);

export default function MedicineDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useMedicineDetail(id);
  const { query } = detail;
  if (query.isLoading) return <DetailState message="Loading medicine…" />;
  if (query.isError)
    return (
      <DetailState
        kind="error"
        message="Couldn’t load medicine"
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data) return <DetailState kind="missing" message="Medicine not found" />;

  const { medication, schedules } = query.data;
  const dosesPerWeek = schedules.reduce(
    (total, schedule) => total + countDays(schedule.weekdayMask),
    0,
  );
  const estimate = estimateSupply(detail.supply, dosesPerWeek);
  const supplyEstimate = estimate
    ? `About ${estimate.daysLeft} ${estimate.daysLeft === 1 ? 'day' : 'days'} left`
    : undefined;
  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.navigation}>
        <PillyIconButton icon="back" label="Back" onPress={() => router.back()} />
        {!medication.archivedAt ? (
          <PillyIconButton
            icon="edit"
            label="Edit medicine"
            onPress={() =>
              router.push({ pathname: '/medicine/[id]/edit', params: { id: medication.id } })
            }
          />
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <Animated.View entering={enter(0)} style={styles.medicineHero}>
        <MedicationAppearance
          shape={medication.appearanceShape}
          size={medication.appearanceSize}
          color={medication.appearanceColor}
          secondaryColor={medication.appearanceSecondaryColor}
        />
        <View style={styles.medicineCopy}>
          <PillyText role="large-title" accessibilityRole="header">
            {medication.name}
          </PillyText>
          <PillyText role="caption" muted style={styles.appearanceLabel}>
            {medication.appearanceSize} {medication.appearanceShape}
          </PillyText>
          {medication.instructions ? <PillyText muted>{medication.instructions}</PillyText> : null}
          {medication.archivedAt ? (
            <PillyText role="caption" muted>
              Archived
            </PillyText>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View entering={enter(50)} style={styles.section}>
        <PillyText role="headline">Overview</PillyText>
        <PillyCard padding="none" style={styles.overviewCard}>
          {schedules.length === 0 ? (
            <View style={styles.overviewRow}>
              <View style={styles.rowCopy}>
                <PillyText role="label">Schedule</PillyText>
                <PillyText role="caption" muted>
                  Not scheduled
                </PillyText>
              </View>
              {!medication.archivedAt ? (
                <PillyIconButton
                  icon="edit"
                  label="Edit medicine schedule"
                  onPress={() =>
                    router.push({ pathname: '/medicine/[id]/edit', params: { id: medication.id } })
                  }
                />
              ) : null}
            </View>
          ) : (
            schedules.map((schedule, index) => (
              <View key={schedule.id}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <View style={styles.overviewRow}>
                  <View style={styles.rowCopy}>
                    <PillyText role="label">Schedule</PillyText>
                    <PillyText role="title">{formatTime(schedule.hour, schedule.minute)}</PillyText>
                    <PillyText role="caption" muted>
                      {scheduleDays(schedule.weekdayMask)} · Reminder
                    </PillyText>
                  </View>
                  <PillyToggle
                    value={schedule.reminderEnabled}
                    label={`Reminder at ${formatTime(schedule.hour, schedule.minute)}`}
                    disabled={detail.reminderMutation.isPending}
                    onValueChange={(enabled) =>
                      detail.reminderMutation.mutate({ scheduleId: schedule.id, enabled })
                    }
                  />
                </View>
              </View>
            ))
          )}
          <View style={styles.separator} />
          <View style={styles.supplyRow}>
            <PillyNumberPicker
              label="Supply"
              value={detail.supply}
              onChange={detail.setSupplyDraft}
              presets={[]}
              showOff={false}
              supportingText={supplyEstimate}
              embedded
            />
          </View>
        </PillyCard>
        {detail.reminderMutation.isError ? (
          <PillyBanner kind="error" message="Reminder not changed. Try again." compact />
        ) : null}
        {detail.supplyMutation.isError ? (
          <PillyBanner
            kind="error"
            message="Count not saved. Try again."
            actionLabel="Retry"
            onAction={detail.retrySupply}
            compact
          />
        ) : null}
      </Animated.View>

      <Animated.View entering={enter(100)} style={styles.section}>
        <PillyText role="headline">Manage</PillyText>
        <PillyCard padding="none" style={styles.manageCard}>
          <ManageRow
            label="Dose history"
            hint="View recorded changes"
            onPress={() =>
              router.push({ pathname: '/medicine/[id]/history', params: { id: medication.id } })
            }
          />
          <View style={styles.separator} />
          <ManageRow
            label={medication.archivedAt ? 'Restore' : 'Archive'}
            hint={medication.archivedAt ? 'Return to your schedule' : 'Hide from Today and Week'}
            disabled={detail.archiveMutation.isPending}
            onPress={() =>
              medication.archivedAt
                ? detail.archiveMutation.mutate(false)
                : detail.setConfirmArchive(true)
            }
          />
          <View style={styles.separator} />
          <ManageRow
            label="Delete"
            hint="Permanently delete this medicine and its history"
            danger
            disabled={detail.deleteMutation.isPending}
            onPress={() => detail.setConfirmDelete(true)}
          />
        </PillyCard>
        {detail.archiveMutation.isError || detail.deleteMutation.isError ? (
          <PillyBanner kind="error" message="Change not saved. Try again." compact />
        ) : null}
      </Animated.View>

      <PillyModal
        visible={detail.confirmArchive}
        title="Archive?"
        message="Hide it from Today and Week. History stays saved."
        confirmLabel="Archive"
        confirmLoading={detail.archiveMutation.isPending}
        onConfirm={() => detail.archiveMutation.mutate(true)}
        onClose={() => detail.setConfirmArchive(false)}
      />
      <PillyModal
        visible={detail.confirmDelete}
        title="Delete medicine?"
        message="Deletes this medicine and its history. This can’t be undone."
        confirmLabel="Delete"
        destructive
        confirmLoading={detail.deleteMutation.isPending}
        onConfirm={() => detail.deleteMutation.mutate()}
        onClose={() => detail.setConfirmDelete(false)}
      />
    </Screen>
  );
}

function DetailState({
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

function ManageRow({
  label,
  hint,
  danger,
  disabled,
  onPress,
}: {
  label: string;
  hint: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.manageRow,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <PillyText role="label" style={[styles.rowCopy, danger && styles.dangerText]}>
        {label}
      </PillyText>
      <PillyIcon name="next" size={17} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  navigation: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: { width: 48 },
  medicineHero: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  medicineCopy: { flex: 1, gap: spacing.xs, paddingTop: spacing.xs },
  appearanceLabel: { textTransform: 'capitalize' },
  section: { gap: spacing.sm },
  separator: { height: 1, backgroundColor: colors.surfaceSubtle },
  overviewCard: { overflow: 'hidden' },
  overviewRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  supplyRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowCopy: { flex: 1, gap: 2 },
  manageCard: { overflow: 'hidden' },
  manageRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.4 },
  dangerText: { color: colors.danger },
});
