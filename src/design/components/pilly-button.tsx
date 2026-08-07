import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { PillyText } from './pilly-text';
import { colors, spacing } from '@/design/tokens';

type PillyButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
};
export function PillyButton({
  label,
  variant = 'primary',
  disabled,
  style,
  ...props
}: PillyButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        variantStyles[variant],
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <PillyText role="label" style={variant === 'primary' ? styles.primaryLabel : undefined}>
        {label}
      </PillyText>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { color: colors.surface },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.42 },
});
const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quiet: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
});
