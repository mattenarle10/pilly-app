import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus } from '@/hooks/use-plus';
import { AccountProviderActions } from '@/ui/components/account-provider-actions';
import { ConnectedAccountSummary } from '@/ui/components/connected-account-summary';
import { PillyBanner } from '@/ui/components/pilly-banner';
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
              {active ? 'Plus preview' : 'Preview'} · checkout off
            </PillyText>
          </View>
        ) : null}
        <PillyText role="large-title" accessibilityRole="header" style={styles.heroTitle}>
          Your medicines, ready when you are.
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
          <>
            <AccountProviderActions
              configured={account.configured}
              busy={account.busy}
              signingInWith={account.signingInWith}
              onSignIn={(provider) => void account.signIn(provider)}
            />
            <PillyText role="caption" muted style={styles.centeredCopy}>
              Medicine data stays local.
            </PillyText>
          </>
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

        {!account.configured ? (
          <PillyBanner
            kind="warning"
            message="Account sign-in is not configured in this local build."
            compact
          />
        ) : account.error === 'sign-in' ? (
          <PillyBanner
            kind="error"
            message="Sign-in didn’t finish. Your local data is unchanged."
            compact
          />
        ) : plus.state.kind === 'error' ? (
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
        <PillyText role="headline">Included with Plus</PillyText>
        <View style={styles.benefits}>
          <Benefit
            icon="private"
            title="Private cloud backup"
            message="Medicines, schedules, and dose history."
          />
          <View style={styles.separator} />
          <Benefit
            icon="refresh"
            title="Device recovery"
            message="Restore your records on another device."
          />
          <View style={styles.separator} />
          <Benefit
            icon="photo"
            title="Medicine photos"
            message="Private recognition photos for your medicines."
          />
        </View>
      </View>

      <View style={styles.freePromise}>
        <PillyText role="label">Core tracking stays free</PillyText>
        <PillyText role="caption" muted>
          Reminders, history, and data export stay local without an account.
        </PillyText>
      </View>
    </Screen>
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
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  benefitIcon: { width: 28, alignItems: 'center' },
  benefitCopy: { flex: 1, gap: spacing.xs },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 60, backgroundColor: colors.border },
  freePromise: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  actions: { alignItems: 'center', gap: spacing.sm },
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
