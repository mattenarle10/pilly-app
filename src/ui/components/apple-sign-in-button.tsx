import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { colors } from '@/ui/tokens';

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

  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
      accessibilityHint="Connect your Pilly Plus account"
      accessibilityState={{ busy: loading, disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        inactive && styles.disabled,
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        accessible={false}
        resizeMode="contain"
        source={appleButton}
        style={styles.asset}
      />
      {loading ? (
        <View accessible={false} style={styles.loading}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 56, height: 56 },
  asset: { width: 56, height: 56 },
  loading: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.textPrimary,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.48 },
});
