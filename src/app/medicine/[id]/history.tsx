import { Platform, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { describeDoseHistoryChange, groupDoseHistory, type DoseStatus } from '@/models/dose';
import { EmptyState } from '@/ui/components/empty-state';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyCard } from '@/ui/components/pilly-card';
import { PillyIconButton } from '@/ui/components/pilly-icon-button';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { colors, spacing } from '@/ui/tokens';
import { useDoseHistory } from '@/hooks/use-dose-history';

const scheduledDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});
const scheduledTime = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});
const changedAt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function DoseHistoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const history = useDoseHistory(id);
  const medication = history.data?.medication;
  const occurrences = groupDoseHistory(history.data?.events ?? []);

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (id) {
      router.replace({ pathname: '/medicine/[id]', params: { id } });
      return;
    }
    router.replace('/(tabs)/medicines');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerBackButtonMenuEnabled: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleAlign: 'center',
          headerTitleStyle: { color: colors.textPrimary, fontWeight: '600' },
          headerLeft:
            Platform.OS === 'ios'
              ? undefined
              : () => <PillyIconButton icon="back" label="Back" onPress={leave} />,
          title: medication?.name ?? 'Dose history',
        }}
      />
      {Platform.OS === 'ios' ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            accessibilityLabel="Back"
            hidesSharedBackground
            icon="chevron.backward"
            onPress={leave}
          />
        </Stack.Toolbar>
      ) : null}
      <Screen
        safeAreaEdges={['bottom']}
        contentInsetAdjustmentBehavior="never"
        contentStyle={styles.screen}
      >
        <View style={styles.intro}>
          <PillyText role="title" accessibilityRole="header">
            Dose history
          </PillyText>
          <PillyText muted>Every Taken, Skipped, and correction saved for this medicine.</PillyText>
        </View>

        {history.isLoading ? <PillyBanner message="Loading history…" /> : null}
        {history.isError ? (
          <PillyBanner
            kind="error"
            title="Couldn’t load history"
            message="Your saved records are unchanged."
            actionLabel="Try again"
            onAction={() => void history.refetch()}
          />
        ) : null}
        {!history.isLoading && !history.isError && !medication ? (
          <EmptyState
            icon="medicine"
            title="Medicine not found"
            message="This medicine may have been deleted."
          />
        ) : null}
        {!history.isLoading && !history.isError && medication && occurrences.length === 0 ? (
          <EmptyState
            icon="time"
            title="No recorded changes"
            message="Taken, Skipped, and correction events will appear here."
          />
        ) : null}
        {medication && occurrences.length > 0 ? (
          <PillyCard padding="none" style={styles.audit}>
            {occurrences.map((occurrence, occurrenceIndex) => (
              <View key={occurrence.occurrenceId}>
                {occurrenceIndex > 0 ? <View style={styles.occurrenceSeparator} /> : null}
                <View style={styles.occurrence}>
                  <View style={styles.occurrenceHeader}>
                    <PillyText role="headline">
                      {scheduledDate.format(occurrence.scheduledAt)}
                    </PillyText>
                    <PillyText role="caption" muted>
                      {scheduledTime.format(occurrence.scheduledAt)} dose
                    </PillyText>
                  </View>
                  <View accessibilityRole="list" style={styles.changes}>
                    {occurrence.changes.map((change, changeIndex) => (
                      <View key={change.id} style={styles.change}>
                        <View style={styles.timeline}>
                          <View
                            style={[
                              styles.timelineDot,
                              { backgroundColor: statusColor(change.nextStatus) },
                            ]}
                          />
                          {changeIndex < occurrence.changes.length - 1 ? (
                            <View style={styles.timelineLine} />
                          ) : null}
                        </View>
                        <View style={styles.changeCopy}>
                          <PillyText role="label">{describeDoseHistoryChange(change)}</PillyText>
                          <PillyText role="caption" muted>
                            {changedAt.format(change.occurredAt)}
                          </PillyText>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </PillyCard>
        ) : null}
      </Screen>
    </>
  );
}

function statusColor(status: DoseStatus): string {
  if (status === 'taken') return colors.brand;
  if (status === 'skipped') return colors.warning;
  return colors.textSecondary;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  intro: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  audit: { overflow: 'hidden' },
  occurrence: { gap: spacing.lg, padding: spacing.lg },
  occurrenceHeader: { gap: spacing.xs },
  occurrenceSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
    backgroundColor: colors.border,
  },
  changes: { gap: spacing.md },
  change: { minHeight: 44, flexDirection: 'row', alignItems: 'stretch', gap: spacing.md },
  timeline: { width: 12, alignItems: 'center' },
  timelineDot: { width: 8, height: 8, marginTop: 6, borderRadius: 4 },
  timelineLine: { flex: 1, width: 1, marginTop: spacing.xs, backgroundColor: colors.border },
  changeCopy: { flex: 1, gap: spacing.xs, paddingBottom: spacing.xs },
});
