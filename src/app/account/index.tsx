import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAccountSession } from '@/hooks/use-account-session';
import { AccountProviderActions } from '@/ui/components/account-provider-actions';
import { ConnectedAccountSummary } from '@/ui/components/connected-account-summary';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyButton } from '@/ui/components/pilly-button';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { PillyIcon } from '@/ui/icons';
import { colors, spacing } from '@/ui/tokens';

export default function AccountRoute() {
  const account = useAccountSession();

  const leaveAccount = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  return (
    <Screen
      safeAreaEdges={['bottom']}
      contentInsetAdjustmentBehavior="never"
      contentStyle={styles.screen}
    >
      <View style={styles.intro}>
        <PillyText role="large-title" accessibilityRole="header" style={styles.title}>
          {account.state.kind === 'signed-in' ? 'Your account.' : 'Connect your account.'}
        </PillyText>
        <PillyText muted style={styles.introCopy}>
          {account.state.kind === 'signed-in'
            ? 'Connected for Pilly Plus. Cloud backup remains off until you choose it.'
            : 'Use Apple or Google for private backup and recovery with Pilly Plus.'}
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
          <ConnectedAccountSummary user={account.state.user} />
          <View style={styles.supportId}>
            <PillyText role="caption" muted>
              Support ID
            </PillyText>
            <PillyText role="caption" selectable numberOfLines={1}>
              {account.state.user.id}
            </PillyText>
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
          <View style={styles.localPromise}>
            <PillyIcon name="private" size={20} color={colors.brand} />
            <PillyText role="caption" muted style={styles.localPromiseCopy}>
              Signing in does not upload your medicine data.
            </PillyText>
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
            <AccountProviderActions
              configured={account.configured}
              busy={account.busy}
              signingInWith={account.signingInWith}
              onSignIn={(provider) => void account.signIn(provider)}
            />
            <PillyButton
              label="Keep using Pilly locally"
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
        Free tracking never requires an account or network connection.
      </PillyText>
    </Screen>
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
  supportId: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  localSection: { gap: spacing.lg },
  localPromise: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  localPromiseCopy: { flex: 1 },
  actions: { alignItems: 'center', gap: spacing.xs },
  boundary: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm },
});
