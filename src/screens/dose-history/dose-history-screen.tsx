import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  EmptyState,
  PillyBanner,
  PillyCard,
  PillyIconButton,
  PillyText,
  Screen,
  StatusLabel,
} from '@/design/components';
import { spacing } from '@/design/tokens';
import { useRepository } from '@/hooks';

type Props = { medicationId: string };

export function DoseHistoryScreen({ medicationId }: Props) {
  const repository = useRepository();
  const query = useQuery({
    queryKey: ['dose-history', medicationId],
    queryFn: () => repository.listDoseHistory(medicationId),
    networkMode: 'always',
  });
  return (
    <Screen>
      <View style={styles.header}>
        <PillyIconButton icon="back" label="Back" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <PillyText role="title" accessibilityRole="header">
            Dose history
          </PillyText>
          <PillyText role="caption" muted>
            Recorded changes
          </PillyText>
        </View>
      </View>
      {query.isLoading ? <PillyBanner message="Loading history…" /> : null}
      {query.isError ? (
        <PillyBanner
          kind="error"
          title="Couldn’t load history"
          message="Try again."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {!query.isLoading && query.data?.length === 0 ? (
        <EmptyState
          icon="time"
          title="No recorded changes"
          message="Taken and Skipped changes will appear here."
        />
      ) : null}
      <View style={styles.list}>
        {query.data?.map((event) => (
          <PillyCard key={event.id} padding="medium" style={styles.row}>
            <View style={styles.copy}>
              <PillyText role="headline">
                {event.nextStatus === 'notRecorded' ? 'Returned to Not yet' : 'Recorded'}
              </PillyText>
              <PillyText role="caption" muted>
                Scheduled {event.scheduledOn}
              </PillyText>
              <PillyText role="caption" muted>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(event.occurredAt)}
              </PillyText>
            </View>
            <StatusLabel status={event.nextStatus} />
          </PillyCard>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xs },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
});
