import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus } from '@/hooks/use-plus';
import { GoogleSignInButton } from '@/ui/components/google-sign-in-button';
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
                {active ? 'Plus access preview' : 'Free preview'} · checkout off
              </PillyText>
            </View>
          ) : null}
          <PillyText role="large-title" accessibilityRole="header" style={styles.heroTitle}>
            Your medicines, ready when you need them.
          </PillyText>
          <PillyText muted style={styles.heroCopy}>
            Pilly Plus adds private backup and recovery without changing how local tracking works.
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
              <GoogleSignInButton
                loading={account.busy}
                disabled={!account.configured}
                onPress={() => void account.signIn()}
              />
              <PillyText role="caption" muted style={styles.centeredCopy}>
                Google is used only for Pilly Plus. Signing in does not upload your medicine data.
              </PillyText>
            </>
          ) : (
            <View style={styles.connectedSection}>
              <View style={styles.connectedState}>
                <PillyIcon
                  name={active ? 'success' : 'profile'}
                  size={20}
                  color={active ? colors.success : colors.brand}
                />
                <View style={styles.connectedCopy}>
                  <PillyText role="label">
                    {active ? 'Pilly Plus preview is active' : 'Google account connected'}
                  </PillyText>
                  <PillyText role="caption" muted>
                    {account.state.user.email}
                  </PillyText>
                </View>
              </View>
              <PillyText role="caption" muted style={styles.centeredCopy}>
                {active
                  ? 'No purchase was made. Cloud sync remains off in this local preview.'
                  : 'Checkout remains off while the complete Plus experience is being built.'}
              </PillyText>
              <PillyButton
                label="Manage Pilly Plus account"
                variant="quiet"
                size="medium"
                onPress={() => router.push('/account')}
              />
            </View>
          )}

          {!account.configured ? (
            <PillyBanner
              kind="warning"
              message="Google sign-in is not configured in this local build."
              compact
            />
          ) : account.error === 'sign-in' ? (
            <PillyBanner
              kind="error"
              message="Google sign-in didn’t finish. Your local data is unchanged."
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
              message="Back up medicines, schedules, and dose history to your account."
            />
            <View style={styles.separator} />
            <Benefit
              icon="refresh"
              title="Recovery across devices"
              message="Restore your records on a new device when you choose to."
            />
            <View style={styles.separator} />
            <Benefit
              icon="photo"
              title="Medicine photos"
              message="Keep private recognition photos with your Pilly Plus account."
            />
          </View>
        </View>

        <View style={styles.freePromise}>
          <PillyText role="label">The essentials stay free</PillyText>
          <PillyText role="caption" muted>
            Tracking, reminders, Today, Week, history, and readable data export stay on your device
            without an account.
          </PillyText>
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
  connectedState: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  connectedCopy: { flex: 1, gap: spacing.xs },
  centeredCopy: { maxWidth: 340, textAlign: 'center' },
});
