import { ActivityIndicator, Image, Pressable, StyleSheet } from 'react-native';

import { colors } from '@/ui/tokens';

type GoogleSignInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

const googleButton = require('../../../assets/google-sign-in-ios-light-pill.png');

export function GoogleSignInButton({
  disabled = false,
  loading = false,
  onPress,
}: GoogleSignInButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        accessible={false}
        resizeMode="contain"
        source={googleButton}
        style={styles.asset}
      />
      {loading ? <ActivityIndicator color={colors.textPrimary} style={styles.loading} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 240,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  asset: { width: 240, height: 56 },
  loading: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.48 },
});
