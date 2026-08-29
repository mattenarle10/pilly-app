import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { useAccountSession } from '@/hooks/use-account-session';
import { accountProviderLabel } from '@/models/account';
import { AppleSignInButton } from '@/ui/components/apple-sign-in-button';
import { GoogleSignInButton } from '@/ui/components/google-sign-in-button';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyButton } from '@/ui/components/pilly-button';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { PillyIcon } from '@/ui/icons';
import { colors, radii, shadows, spacing } from '@/ui/tokens';

export default function AccountRoute() {
  const account = useAccountSession();

  const leaveAccount = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
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
          title: 'Pilly Plus account',
        }}
      />
      <Screen
        safeAreaEdges={['bottom']}
        contentInsetAdjustmentBehavior="never"
        contentStyle={styles.screen}
      >
        <View style={styles.intro}>
          <PillyText role="large-title" accessibilityRole="header" style={styles.title}>
            {account.state.kind === 'signed-in' ? 'You’re connected.' : 'Connect Pilly Plus.'}
          </PillyText>
          <PillyText muted style={styles.introCopy}>
            {account.state.kind === 'signed-in'
              ? 'Your Plus account is ready. Cloud sync is not enabled yet.'
              : 'Use Apple or Google to prepare secure backup and recovery across your devices.'}
          </PillyText>
        </View>

        {account.state.kind === 'loading' ? (
          <View accessibilityLabel="Checking account" style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <PillyText role="caption" muted>
              Checking your account…
            </PillyText>
          </View>
        ) : account.state.kind === 'signed-in' ? (
          <View style={styles.connectedSection}>
            <View style={styles.accountSurface}>
              <View style={styles.accountIcon}>
                <PillyIcon name="profile" size={24} color={colors.brand} />
              </View>
              <View style={styles.accountCopy}>
                <PillyText role="headline">{account.state.user.displayName}</PillyText>
                <PillyText role="caption" muted>
                  {accountProviderLabel(account.state.user.provider)} · {account.state.user.email}
                </PillyText>
              </View>
              <PillyIcon name="success" size={20} color={colors.success} />
            </View>
            {account.error === 'sign-out' ? (
              <PillyBanner kind="error" message="Couldn’t securely sign out. Try again." compact />
            ) : null}
            <PillyButton
              label="Sign out"
              variant="secondary"
              size="medium"
              loading={account.busy}
              onPress={() => void account.signOut()}
              fullWidth
            />
          </View>
        ) : (
          <View style={styles.localSection}>
            <View style={styles.accountSurface}>
              <View style={styles.accountIcon}>
                <PillyIcon name="private" size={24} color={colors.brand} />
              </View>
              <View style={styles.accountCopy}>
                <PillyText role="headline">Pilly Plus account</PillyText>
                <PillyText role="caption" muted>
                  Choose Apple or Google. Your free tracker stays local.
                </PillyText>
              </View>
            </View>
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
            ) : null}
            <View style={styles.actions}>
              <AppleSignInButton
                loading={account.signingInWith === 'apple'}
                disabled={!account.configured || account.busy}
                onPress={() => void account.signIn('apple')}
              />
              <GoogleSignInButton
                loading={account.signingInWith === 'google'}
                disabled={!account.configured || account.busy}
                onPress={() => void account.signIn('google')}
              />
              <PillyButton
                label="Not now"
                variant="quiet"
                size="medium"
                disabled={account.busy}
                onPress={leaveAccount}
                fullWidth
              />
            </View>
          </View>
        )}

        <PillyText role="caption" muted style={styles.boundary}>
          Free tracking never requires an account. Signing in does not upload medicine data until
          cloud sync is ready and you choose to use it.
        </PillyText>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  intro: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  title: { fontWeight: '600' },
  introCopy: { maxWidth: 360 },
  loading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  connectedSection: { gap: spacing.md },
  localSection: { gap: spacing.md },
  accountSurface: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: colors.glass,
    ...shadows.soft,
  },
  accountIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCopy: { flex: 1, gap: spacing.xs },
  actions: { alignItems: 'center', gap: spacing.xs },
  boundary: { marginTop: 'auto', paddingHorizontal: spacing.xs, paddingTop: spacing.xl },
});
