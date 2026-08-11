import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { PillyText } from './pilly-text';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { colors, controlHeights, radii, shadows, spacing } from '@/ui/tokens';

type PillyButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'compact' | 'medium' | 'large';
  icon?: PillyIconName;
  fullWidth?: boolean;
  loading?: boolean;
  tone?: 'default' | 'brand';
};
export function PillyButton({
  label,
  variant = 'primary',
  size = 'large',
  icon,
  fullWidth = false,
  loading = false,
  tone = 'default',
  disabled,
  style,
  ...props
}: PillyButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        state.pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {(state) => (
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.brand} />
          ) : icon ? (
            <PillyIcon
              name={icon}
              size={18}
              active={state.pressed}
              color={
                variant === 'primary'
                  ? colors.surface
                  : variant === 'danger'
                    ? colors.danger
                    : colors.textPrimary
              }
            />
          ) : null}
          <PillyText
            role="label"
            maxFontSizeMultiplier={1.6}
            style={[
              styles.label,
              variant === 'primary'
                ? styles.primaryLabel
                : variant === 'danger'
                  ? styles.dangerLabel
                  : tone === 'brand'
                    ? styles.brandLabel
                    : undefined,
            ]}
          >
            {label}
          </PillyText>
        </View>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: {
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { textAlign: 'center' },
  fullWidth: { width: '100%' },
  primaryLabel: { color: colors.surface },
  brandLabel: { color: colors.brand },
  dangerLabel: { color: colors.danger },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.42 },
});
const sizeStyles = StyleSheet.create({
  compact: { minHeight: controlHeights.compact, paddingHorizontal: spacing.lg },
  medium: { minHeight: controlHeights.medium, paddingHorizontal: spacing.xl },
  large: { minHeight: controlHeights.large, paddingHorizontal: spacing.xxl },
});
const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.brand, ...shadows.soft },
  secondary: { backgroundColor: colors.glass, ...shadows.soft },
  quiet: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.glass },
});
