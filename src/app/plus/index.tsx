import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus } from '@/hooks/use-plus';
import { ConnectedAccountSummary } from '@/ui/components/connected-account-summary';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyButton } from '@/ui/components/pilly-button';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { PillyPlusCompanion } from '@/ui/illustrations';
import { colors, radii, shadows, spacing } from '@/ui/tokens';

export default function PlusRoute() {
  const account = useAccountSession();
  const plus = usePlus();
  const preview = plus.state.kind === 'preview';
  const signedIn = account.state.kind === 'signed-in';
  const active = signedIn && plus.state.active;

  return (
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
              Preview
            </PillyText>
          </View>
        ) : null}
        <PillyText role="large-title" accessibilityRole="header" style={styles.heroTitle}>
          Your medicines, safely backed up.
        </PillyText>
        <PillyText muted style={styles.heroCopy}>
          Private backup, recovery, and photos. Tracking stays local.
        </PillyText>
      </View>

      <View style={styles.actions}>
        {account.state.kind === 'loading' || plus.state.kind === 'loading' ? (
          <View accessibilityLabel="Checking Pilly Plus" style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <PillyText role="caption" muted>
              Checking Pilly Plus…
            </PillyText>
          </View>
        ) : account.state.kind !== 'signed-in' ? (
          <PillyButton
            label="Connect account"
            accessibilityHint="Choose Apple or Google on the Account screen"
            onPress={() => router.push('/account')}
            fullWidth
          />
        ) : (
          <View style={styles.connectedSection}>
            <ConnectedAccountSummary
              user={account.state.user}
              active={active}
              onPress={() => router.push('/account')}
            />
            <PillyText role="caption" muted style={styles.centeredCopy}>
              {active
                ? 'Preview access only. Cloud backup remains off.'
                : 'Checkout and cloud backup remain off.'}
            </PillyText>
          </View>
        )}

        {plus.state.kind === 'error' ? (
          <PillyBanner
            kind="error"
            title="Couldn’t check Pilly Plus"
            message="Your saved access is unchanged. Try again when you’re connected."
            actionLabel="Try again"
            onAction={() => void plus.retry()}
          />
        ) : null}
      </View>

      <View style={styles.benefitsSection}>
        <PillyText role="headline">With Plus</PillyText>
        <View style={styles.benefits}>
          <Benefit icon="private" title="Private backup" />
          <View style={styles.separator} />
          <Benefit icon="refresh" title="Device recovery" />
          <View style={styles.separator} />
          <Benefit icon="photo" title="Medicine photos" />
        </View>
      </View>

      <View style={styles.freePromise}>
        <PillyText role="label">Core tracking stays free</PillyText>
        <PillyText role="caption" muted>
          Reminders, history, and export stay free.
        </PillyText>
      </View>
    </Screen>
  );
}

function Benefit({ icon, title }: { icon: PillyIconName; title: string }) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>
        <PillyIcon name={icon} size={20} color={colors.brand} />
      </View>
      <PillyText role="label" style={styles.benefitCopy}>
        {title}
      </PillyText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
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
  heroTitle: { maxWidth: 340, textAlign: 'center', fontWeight: '600' },
  heroCopy: { maxWidth: 340, textAlign: 'center' },
  benefitsSection: { gap: spacing.md },
  benefits: {
    overflow: 'hidden',
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  benefit: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  benefitIcon: { width: 28, alignItems: 'center' },
  benefitCopy: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 60, backgroundColor: colors.border },
  freePromise: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  actions: { width: '100%', alignItems: 'center', gap: spacing.sm },
  loading: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  connectedSection: { width: '100%', alignItems: 'center', gap: spacing.sm },
  centeredCopy: { maxWidth: 340, textAlign: 'center' },
});
