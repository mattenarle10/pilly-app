import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  PillyBanner,
  PillyButton,
  PillyCard,
  PillyIconButton,
  PillyIconTile,
  PillyModal,
  PillyText,
  Screen,
} from '@/design/components';
import { PillyIcon, type PillyIconName } from '@/design/icons';
import { colors, spacing } from '@/design/tokens';
import { purchasePlus, refreshPlusEntitlement, restorePlus } from '@/platform/purchases';
import { useRepository } from '@/providers';

type Notice = { kind: 'error' | 'success'; message: string };

export function PlusScreen() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
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
    setBusy(true);
    setNotice(null);
    try {
      const active = await action();
      if (!active) throw new Error('Plus is not active yet. Try Restore.');
      await repository.setSetting('plusEntitled', 'true');
      await queryClient.invalidateQueries({ queryKey: ['entitlement', 'plus'] });
      setNotice({ kind: 'success', message: success });
    } catch (cause) {
      setNotice({
        kind: 'error',
        message: cause instanceof Error ? cause.message : 'The App Store could not finish.',
      });
    } finally {
      setBusy(false);
    }
  };
  const buy = () => {
    setShowBuy(false);
    void run(purchasePlus, 'Pilly Plus is active.');
  };

  return (
    <Screen>
      <PillyIconButton icon="back" label="Back" onPress={() => router.back()} />
      <View style={styles.title}>
        <PillyText role="large-title">Pilly Plus</PillyText>
        <PillyText muted>
          {entitlement.data ? 'Active on this iPhone.' : 'One purchase. No subscription.'}
        </PillyText>
      </View>
      <View style={styles.features}>
        <Feature icon="print" title="Printable plan" />
        <Feature icon="document" title="CSV export" />
        <Feature icon="palette" title="Themes and icons" />
      </View>
      <PillyCard tone="peach" style={styles.promise}>
        <View style={styles.promiseTitle}>
          <PillyIcon name="favorite" size={21} color={colors.brand} />
          <PillyText role="headline">Core stays free</PillyText>
        </View>
        <PillyText role="caption" muted>
          Tracking, reminders, and supply.
        </PillyText>
      </PillyCard>
      {notice ? <PillyBanner kind={notice.kind} message={notice.message} /> : null}
      {!entitlement.data ? (
        <PillyButton
          label="Buy once · $4.99"
          icon="unlock"
          loading={busy}
          onPress={() => setShowBuy(true)}
          fullWidth
        />
      ) : null}
      <PillyButton
        label="Restore"
        icon="refresh"
        size="medium"
        variant="quiet"
        disabled={busy}
        onPress={() => void run(restorePlus, 'Purchase restored.')}
        fullWidth
      />
      <PillyModal
        visible={showBuy}
        title="Unlock Pilly Plus?"
        message="One payment of $4.99. The App Store will confirm it."
        confirmLabel="Continue"
        onConfirm={buy}
        onClose={() => setShowBuy(false)}
      />
    </Screen>
  );
}

function Feature({ icon, title }: { icon: PillyIconName; title: string }) {
  return (
    <PillyCard padding="medium" style={styles.feature}>
      <PillyIconTile icon={icon} tone="lavender" />
      <PillyText role="headline" style={styles.featureCopy}>
        {title}
      </PillyText>
      <PillyIcon name="done" size={20} color={colors.success} />
    </PillyCard>
  );
}

const styles = StyleSheet.create({
  title: { gap: spacing.sm, marginBottom: spacing.xl },
  features: { gap: spacing.md },
  feature: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureCopy: { flex: 1 },
  promise: { gap: spacing.sm, marginVertical: spacing.xxl },
  promiseTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
