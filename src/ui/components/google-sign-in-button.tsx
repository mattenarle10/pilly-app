import { StyleSheet } from 'react-native';

import { AccountProviderButton } from '@/ui/components/account-provider-button';

type GoogleSignInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

const googleButton = require('../../../assets/google-sign-in-ios-light-square.png');

export function GoogleSignInButton({
  disabled = false,
  loading = false,
  onPress,
}: GoogleSignInButtonProps) {
  return (
    <AccountProviderButton
      asset={googleButton}
      disabled={disabled}
      label="Continue with Google"
      loading={loading}
      logoStyle={styles.logo}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  logo: { width: 60, height: 60 },
});
