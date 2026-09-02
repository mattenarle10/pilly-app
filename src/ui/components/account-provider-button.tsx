import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { colors, controlHeights, radii } from '@/ui/tokens';

type Props = {
  asset: ImageSourcePropType;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
};

export function AccountProviderButton({
  asset,
  disabled = false,
  label,
  loading = false,
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
      hitSlop={6}
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
        source={asset}
        style={styles.asset}
      />
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
    width: controlHeights.compact,
    height: controlHeights.compact,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  asset: { width: controlHeights.compact, height: controlHeights.compact },
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
