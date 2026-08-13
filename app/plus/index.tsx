import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';

import { PillyBanner, PillyButton, PillyText, Screen } from '@/ui/components';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { PillyPlusCompanion } from '@/ui/illustrations';
import { colors, radii, shadows, spacing } from '@/ui/tokens';
import { usePlus } from '@/hooks';

type Notice = { kind: 'error' | 'info'; message: string };

export default function PlusRoute() {
  const plus = usePlus();
  const [notice, setNotice] = useState<Notice | null>(null);
  const busy = plus.purchase.isPending || plus.restore.isPending;
  const preview = plus.state.kind === 'preview';
  const active = plus.state.active;

  const buy = async () => {
    setNotice(null);
    try {
      const result = await plus.purchase.mutateAsync();
      if (result.kind === 'inactive') {
        setNotice({ kind: 'error', message: 'The purchase finished, but Plus is not active yet.' });
      }
    } catch (cause) {
      setNotice({
        kind: 'error',
        message: cause instanceof Error ? cause.message : 'The App Store could not finish.',
      });
    }
  };

  const restore = async () => {
    setNotice(null);
    try {
      const result = await plus.restore.mutateAsync();
      if (result.kind === 'inactive') {
        setNotice({ kind: 'info', message: 'No Pilly Plus purchase was found for this Apple ID.' });
      }
    } catch (cause) {
      setNotice({
        kind: 'error',
        message: cause instanceof Error ? cause.message : 'The App Store could not restore Plus.',
      });
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerBackButtonMenuEnabled: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleAlign: 'center',
          headerTitleStyle: { color: colors.textPrimary, fontWeight: '600' },
          title: 'Pilly Plus',
        }}
      />
      <Screen
        safeAreaEdges={['bottom']}
        contentInsetAdjustmentBehavior="never"
        contentStyle={styles.screen}
      >
        <View style={styles.hero}>
          <PillyPlusCompanion />
          {preview ? (
            <View style={styles.previewStatus}>
              <PillyIcon name="info" size={16} color={colors.brand} />
              <PillyText role="caption" style={styles.previewStatusLabel}>
                {active ? 'Paid version preview' : 'Free version preview'}
              </PillyText>
            </View>
          ) : null}
          <PillyText role="large-title" accessibilityRole="header" style={styles.heroTitle}>
            {active ? 'Pilly Plus is yours.' : 'Clear records, ready to share.'}
          </PillyText>
          <PillyText muted style={styles.heroCopy}>
            {active
              ? 'Your advanced export tools are unlocked for life.'
              : 'Turn your medicine plan and dose history into useful files.'}
          </PillyText>
        </View>

        <View style={styles.benefitsSection}>
          <PillyText role="headline">Included with Plus</PillyText>
          <View style={styles.benefits}>
            <Benefit
              icon="print"
              title="Medicine plan PDF"
              message="A clean plan for home, travel, or appointments."
            />
            <View style={styles.separator} />
            <Benefit
              icon="calendar"
              title="Dose history spreadsheet"
              message="A CSV you can sort, filter, and keep."
            />
          </View>
        </View>

        <View style={styles.freePromise}>
          <View style={styles.freePromiseCopy}>
            <PillyText role="label">The essentials stay free</PillyText>
            <PillyText role="caption" muted>
              Tracking, reminders, history, and a complete data export.
            </PillyText>
          </View>
        </View>

        <View style={styles.actions}>
          {plus.state.kind === 'loading' ? (
            <View accessibilityLabel="Loading Pilly Plus" style={styles.loading}>
              <ActivityIndicator color={colors.brand} />
              <PillyText role="caption" muted>
                Checking Plus…
              </PillyText>
            </View>
          ) : active ? (
            <View style={styles.activeState}>
              <PillyIcon name="done" size={20} color={colors.success} />
              <View style={styles.activeStateCopy}>
                <PillyText role="label">
                  {preview ? 'Paid version preview' : 'Pilly Plus is active'}
                </PillyText>
                <PillyText role="caption" muted>
                  {plus.state.kind === 'active' && plus.state.offline
                    ? 'Using your saved access while the store is offline.'
                    : preview
                      ? 'No real App Store entitlement was changed.'
                      : 'Purchased once. Yours to keep.'}
                </PillyText>
              </View>
            </View>
          ) : plus.state.kind === 'available' ? (
            <>
              <PillyButton
                label={`Unlock for ${plus.state.offer.localizedPrice}`}
                icon="unlock"
                loading={plus.purchase.isPending}
                onPress={() => void buy()}
                fullWidth
              />
              <PillyText role="caption" muted style={styles.purchaseNote}>
                Lifetime access. No subscription.
              </PillyText>
            </>
          ) : plus.state.kind === 'error' ? (
            <PillyBanner
              kind="error"
              title="Couldn’t reach the App Store"
              message="Your saved access is unchanged. Try again when you’re connected."
              actionLabel="Try again"
              onAction={() => void plus.retry()}
            />
          ) : (
            <View style={styles.unavailable}>
              <PillyText role="label" style={styles.centeredCopy}>
                {preview
                  ? 'Checkout is off in preview mode'
                  : plus.state.kind === 'unavailable' && plus.state.reason === 'gate'
                    ? 'Plus is not for sale in this build yet'
                    : 'Plus is not available yet'}
              </PillyText>
              <PillyText role="caption" muted style={styles.centeredCopy}>
                {preview
                  ? 'Use store mode to test a real RevenueCat offering.'
                  : plus.state.kind === 'unavailable' && plus.state.reason === 'gate'
                    ? 'The export tools are ready. Checkout opens after device purchase testing.'
                    : 'You can keep using every essential Pilly feature for free.'}
              </PillyText>
            </View>
          )}

          {notice ? <PillyBanner kind={notice.kind} message={notice.message} compact /> : null}

          {plus.state.canRestore && !active ? (
            <PillyButton
              label="Restore purchase"
              variant="quiet"
              size="medium"
              disabled={busy}
              onPress={() => void restore()}
              fullWidth
            />
          ) : null}
        </View>
      </Screen>
    </>
  );
}

function Benefit({
  icon,
  title,
  message,
}: {
  icon: PillyIconName;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>
        <PillyIcon name={icon} size={20} color={colors.brand} />
      </View>
      <View style={styles.benefitCopy}>
        <PillyText role="label">{title}</PillyText>
        <PillyText role="caption" muted>
          {message}
        </PillyText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  hero: { alignItems: 'center', gap: spacing.sm },
  previewStatus: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.lavenderSoft,
  },
  previewStatusLabel: { color: colors.brand },
  heroTitle: { maxWidth: 360, textAlign: 'center', fontWeight: '600' },
  heroCopy: { maxWidth: 360, textAlign: 'center' },
  benefitsSection: { gap: spacing.md },
  benefits: {
    overflow: 'hidden',
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  benefit: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  benefitIcon: { width: 28, alignItems: 'center' },
  benefitCopy: { flex: 1, gap: spacing.xs },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 60, backgroundColor: colors.border },
  freePromise: {
    paddingHorizontal: spacing.xs,
  },
  freePromiseCopy: { flex: 1, gap: spacing.xs },
  actions: { gap: spacing.sm },
  loading: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  activeState: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  activeStateCopy: { flex: 1, gap: spacing.xs },
  purchaseNote: { textAlign: 'center' },
  unavailable: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  centeredCopy: { textAlign: 'center' },
});
