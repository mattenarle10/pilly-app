import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import type { AccountProvider } from '@/models/account';
import type { PlusPlan } from '@/services/plus-offers';
import { useAccountSession } from '@/hooks/use-account-session';
import { useCloudSync } from '@/hooks/use-cloud-sync';
import { AccountProviderActions } from '@/ui/components/account-provider-actions';
import { ConnectedAccountSummary } from '@/ui/components/connected-account-summary';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyButton } from '@/ui/components/pilly-button';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { colors, spacing } from '@/ui/tokens';

export default function AccountRoute() {
  const account = useAccountSession();
  const cloud = useCloudSync();
  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    plan?: string | string[];
    intent?: string | string[];
  }>();
  const returnsToPlus = firstParam(params.returnTo) === 'plus';
  const plan = plusPlan(firstParam(params.plan));
  const intent = firstParam(params.intent) === 'restore' ? 'restore' : null;

  const leaveAccount = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };
  const connect = async (provider: AccountProvider) => {
    const connected = await account.signIn(provider);
    if (!connected || !returnsToPlus) return;
    router.replace({
      pathname: '/plus',
      params: {
        ...(plan ? { plan } : {}),
        ...(intent ? { intent } : {}),
      },
    });
  };
  const confirmAccountDeletion = () => {
    Alert.alert(
      'Delete Pilly Plus account?',
      'This deletes your cloud backup and private medicine photos. Medicines stay on this iPhone. Your App Store subscription is managed separately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void account.deleteAccount().then((deleted) => {
              if (!deleted) return;
              router.replace('/profile');
              if (account.state.kind === 'signed-in' && account.state.user.provider === 'apple') {
                Alert.alert(
                  'Account deleted',
                  'To remove Pilly from Sign in with Apple too, open your Apple Account and stop using Pilly. Your App Store subscription is managed separately.',
                  [
                    { text: 'Done', style: 'cancel' },
                    {
                      text: 'Open Apple Account',
                      onPress: () => void Linking.openURL('https://account.apple.com/'),
                    },
                  ],
                );
              }
            });
          },
        },
      ],
    );
  };
  const confirmSignOut = () => {
    Alert.alert(
      'Sign out of Pilly Plus?',
      'Downloaded account data will be removed from this iPhone. Your private backup and App Store subscription stay active.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', onPress: () => void account.signOut() },
      ],
    );
  };

  return (
    <Screen
      safeAreaEdges={['bottom']}
      contentInsetAdjustmentBehavior="never"
      contentStyle={styles.screen}
    >
      <View style={styles.intro}>
        <PillyText role="large-title" accessibilityRole="header" style={styles.title}>
          {account.state.kind === 'signed-in' ? 'Your account' : 'Connect Pilly Plus'}
        </PillyText>
        <PillyText muted style={styles.introCopy}>
          {account.state.kind === 'signed-in'
            ? 'Backup stays off until you choose it.'
            : 'Choose Apple or Google.'}
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
          <CloudSetup cloud={cloud} />
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
          ) : account.error === 'delete' ? (
            <PillyBanner
              kind="error"
              message="Account not deleted. Your medicines are unchanged. Try again."
              compact
            />
          ) : null}
          <PillyButton
            label="Sign out"
            variant="secondary"
            size="medium"
            loading={account.busy}
            onPress={confirmSignOut}
            fullWidth
          />
          <PillyButton
            label="Manage App Store subscription"
            variant="quiet"
            size="medium"
            disabled={account.busy}
            onPress={() => void Linking.openURL('https://apps.apple.com/account/subscriptions')}
            fullWidth
          />
          <PillyButton
            label="Delete Pilly Plus account"
            variant="danger"
            size="medium"
            disabled={account.busy}
            accessibilityHint="Deletes cloud backup and account data but keeps medicines on this iPhone"
            onPress={confirmAccountDeletion}
            fullWidth
          />
        </View>
      ) : (
        <View style={styles.localSection}>
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
              onSignIn={(provider) => void connect(provider)}
            />
            <PillyText role="caption" muted>
              Medicine data stays local.
            </PillyText>
            <PillyButton
              label="Not now"
              variant="quiet"
              size="medium"
              disabled={account.busy}
              accessibilityHint="Keep using Pilly locally"
              onPress={leaveAccount}
              fullWidth
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function plusPlan(value: string | undefined): PlusPlan | null {
  return value === 'annual' || value === 'monthly' ? value : null;
}

function CloudSetup({ cloud }: { cloud: ReturnType<typeof useCloudSync> }) {
  switch (cloud.status.kind) {
    case 'checking':
      return (
        <View accessibilityLabel="Checking cloud backup" style={styles.cloudChecking}>
          <ActivityIndicator color={colors.brand} />
          <PillyText role="caption" muted>
            Checking backup…
          </PillyText>
        </View>
      );
    case 'pending-backup':
      return (
        <PillyButton
          label="Back up this iPhone"
          onPress={() => void cloud.chooseSetup('backup')}
          fullWidth
        />
      );
    case 'pending-restore':
      return (
        <PillyButton
          label="Restore from Pilly"
          onPress={() => void cloud.chooseSetup('restore')}
          fullWidth
        />
      );
    case 'pending-merge':
      return (
        <View style={styles.cloudAction}>
          <PillyBanner
            kind="info"
            message="This iPhone and your account both have medicine data."
            compact
          />
          <PillyButton
            label="Merge safely"
            onPress={() => void cloud.chooseSetup('merge')}
            fullWidth
          />
        </View>
      );
    case 'active':
      return (
        <PillyBanner
          kind={cloud.status.lastError ? 'warning' : 'success'}
          message={
            cloud.status.syncing
              ? 'Backing up…'
              : cloud.status.lastError
                ? 'Backup will retry when Pilly is open.'
                : 'Private backup is on.'
          }
          actionLabel={cloud.status.lastError ? 'Retry' : undefined}
          onAction={cloud.status.lastError ? () => void cloud.retry() : undefined}
          compact
        />
      );
    case 'entitlement-required':
      return <PillyBanner kind="info" message="Pilly Plus is required for backup." compact />;
    case 'blocked-account':
      return (
        <PillyBanner
          kind="warning"
          message="This iPhone already has data from another Pilly account."
          compact
        />
      );
    case 'error':
      return (
        <PillyBanner
          kind="error"
          message={cloud.status.message}
          actionLabel="Retry"
          onAction={() => void cloud.retry()}
          compact
        />
      );
    case 'local':
      return null;
  }
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
  cloudChecking: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cloudAction: { gap: spacing.sm },
  supportId: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  localSection: { gap: spacing.md },
  actions: { alignItems: 'center', gap: spacing.xs },
});
