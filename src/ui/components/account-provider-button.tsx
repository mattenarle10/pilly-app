import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

import { colors, controlHeights, radii, shadows } from '@/ui/tokens';

type Props = {
  asset: ImageSourcePropType;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  logoStyle: StyleProp<ImageStyle>;
  onPress: () => void;
};

export function AccountProviderButton({
  asset,
  disabled = false,
  label,
  loading = false,
  logoStyle,
  onPress,
}: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
      <View accessible={false} style={styles.logoWindow}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={asset}
          style={logoStyle}
        />
      </View>
      {loading ? (
        <View accessible={false} style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: controlHeights.large,
    height: controlHeights.large,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  logoWindow: {
    width: 30,
    height: 30,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.48 },
});
