import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { AccountProviderButton } from '@/ui/components/account-provider-button';
import { controlHeights } from '@/ui/tokens';

type AppleSignInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

const appleButton = require('../../../assets/apple-sign-in-ios-light-square.png');

export function AppleSignInButton({
  disabled = false,
  loading = false,
  onPress,
}: AppleSignInButtonProps) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void AppleAuthentication.isAvailableAsync().then((isAvailable) => {
      if (active) setAvailable(isAvailable);
    });
    return () => {
      active = false;
    };
  }, []);

  if (available === null) return <View accessible={false} style={styles.button} />;
  if (!available) return null;

  return (
    <AccountProviderButton
      asset={appleButton}
      disabled={disabled}
      label="Continue with Apple"
      loading={loading}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  button: { width: controlHeights.compact, height: controlHeights.compact },
});
