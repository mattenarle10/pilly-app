import { StyleSheet, View } from 'react-native';

import type { AccountProvider } from '@/models/account';
import { AppleSignInButton } from '@/ui/components/apple-sign-in-button';
import { GoogleSignInButton } from '@/ui/components/google-sign-in-button';
import { spacing } from '@/ui/tokens';

type Props = {
  configured: boolean;
  busy: boolean;
  signingInWith: AccountProvider | null;
  onSignIn: (provider: AccountProvider) => void;
};

export function AccountProviderActions({ configured, busy, signingInWith, onSignIn }: Props) {
  const disabled = !configured || busy;

  return (
    <View accessibilityLabel="Pilly account sign-in options" style={styles.actions}>
      <AppleSignInButton
        loading={signingInWith === 'apple'}
        disabled={disabled}
        onPress={() => onSignIn('apple')}
      />
      <GoogleSignInButton
        loading={signingInWith === 'google'}
        disabled={disabled}
        onPress={() => onSignIn('google')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: 'center', gap: spacing.sm },
});
