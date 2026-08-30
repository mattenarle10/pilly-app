import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { colors } from '@/ui/tokens';

type AppleSignInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function AppleSignInButton({
  disabled = false,
  loading = false,
  onPress,
}: AppleSignInButtonProps) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    void AppleAuthentication.isAvailableAsync().then((isAvailable) => {
      if (active) setAvailable(isAvailable);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!available) return null;

  const inactive = disabled || loading;
  return (
    <View
      accessibilityState={{ busy: loading, disabled: inactive }}
      pointerEvents={inactive ? 'none' : 'auto'}
      style={[styles.button, inactive && styles.disabled]}
    >
      <AppleAuthentication.AppleAuthenticationButton
        accessibilityLabel="Sign in with Apple"
        accessibilityState={{ busy: loading, disabled: inactive }}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        cornerRadius={28}
        onPress={onPress}
        style={styles.button}
      />
      {loading ? (
        <View accessible={false} style={styles.loading}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { width: 240, height: 56 },
  loading: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.48 },
});
