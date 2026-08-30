import { StyleSheet, View } from 'react-native';

import type { AccountProvider } from '@/models/account';
import { AppleSignInButton } from '@/ui/components/apple-sign-in-button';
import { GoogleSignInButton } from '@/ui/components/google-sign-in-button';
import { PillyText } from '@/ui/components/pilly-text';
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
    <View style={styles.actions}>
      <PillyText role="caption" muted>
        Continue with
      </PillyText>
      <View style={styles.providers}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: 'center', gap: spacing.sm },
  providers: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
