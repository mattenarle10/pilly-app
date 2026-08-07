import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { PillyButton, PillyText, Screen } from '@/design/components';
import { WeeklyOrganizer } from '@/design/illustrations';
import { colors, spacing } from '@/design/tokens';
import { purchasePlus, refreshPlusEntitlement, restorePlus } from '@/platform/purchases';
import { useRepository } from '@/providers';

const previewDays = Array.from({ length: 7 }, (_, index) => ({
  key: `${index}`,
  label: '',
  state: index < 4 ? ('taken' as const) : ('scheduled' as const),
}));

export function PlusScreen() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const entitlement = useQuery({
    queryKey: ['entitlement', 'plus'],
    networkMode: 'always',
    queryFn: async () => {
      const cached = (await repository.getSetting('plusEntitled')) === 'true';
      try {
        const current = await refreshPlusEntitlement();
        if (current !== null) await repository.setSetting('plusEntitled', `${current}`);
        return current ?? cached;
      } catch {
        return cached;
      }
    },
  });
  const run = async (action: () => Promise<boolean>, success: string) => {
    setMessage(null);
    try {
      const active = await action();
      if (!active) {
        throw new Error(
          'The purchase completed, but Pilly Plus is not active yet. Try Restore purchase.',
        );
      }
      await repository.setSetting('plusEntitled', 'true');
      await queryClient.invalidateQueries({ queryKey: ['entitlement', 'plus'] });
      setMessage(success);
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : 'The App Store could not complete that request.',
      );
    }
  };
  return (
    <Screen>
      <PillyButton label="Back" variant="quiet" onPress={() => router.back()} />
      <WeeklyOrganizer days={previewDays} presentation="supply" height={150} />
      <View style={styles.title}>
        <PillyText role="large-title">Pilly Plus</PillyText>
        <PillyText muted>
          {entitlement.data
            ? 'Active on this iPhone.'
            : 'A one-time purchase for the parts that make Pilly easier to share and personalize.'}
        </PillyText>
      </View>
      <View style={styles.features}>
        <Feature
          title="Printable medicine plan"
          body="Make a clear paper copy for the fridge, a bag, or a family conversation."
        />
        <Feature title="CSV export" body="Keep a portable copy of medicine and dose history." />
        <Feature title="More themes and icons" body="Choose a look that is easier to recognize." />
      </View>
      <View style={styles.promise}>
        <PillyText role="headline">The core stays free</PillyText>
        <PillyText muted>
          Today, week, dose history, reminders, and supply estimates do not require Plus.
        </PillyText>
      </View>
      {message ? (
        <PillyText accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </PillyText>
      ) : null}
      {!entitlement.data ? (
        <PillyButton
          label="Buy once · $4.99"
          onPress={() => void run(purchasePlus, 'Pilly Plus is active.')}
        />
      ) : null}
      <PillyButton
        label="Restore purchase"
        variant="quiet"
        onPress={() => void run(restorePlus, 'Your purchases were restored.')}
      />
    </Screen>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureDot} />
      <View style={styles.featureCopy}>
        <PillyText role="headline">{title}</PillyText>
        <PillyText muted>{body}</PillyText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { gap: spacing.sm, marginBottom: spacing.xxl },
  features: { gap: spacing.xl },
  feature: { flexDirection: 'row', gap: spacing.lg },
  featureDot: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.brandSoft },
  featureCopy: { flex: 1, gap: spacing.xs },
  promise: {
    gap: spacing.sm,
    marginVertical: spacing.xxl,
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.peachSoft,
  },
  message: { marginBottom: spacing.lg, color: colors.warning },
});
