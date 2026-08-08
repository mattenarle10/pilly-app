import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { PillyText } from './pilly-text';
import { colors, controlHeights, radii, shadows, spacing } from '@/design/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

type PillyButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'compact' | 'medium' | 'large';
  icon?: IconName;
  fullWidth?: boolean;
  loading?: boolean;
};
export function PillyButton({
  label,
  variant = 'primary',
  size = 'large',
  icon,
  fullWidth = false,
  loading = false,
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
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.brand} />
        ) : icon ? (
          <Ionicons
            name={icon}
            size={18}
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
          style={
            variant === 'primary'
              ? styles.primaryLabel
              : variant === 'danger'
                ? styles.dangerLabel
                : undefined
          }
        >
          {label}
        </PillyText>
      </View>
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
  fullWidth: { width: '100%' },
  primaryLabel: { color: colors.surface },
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
