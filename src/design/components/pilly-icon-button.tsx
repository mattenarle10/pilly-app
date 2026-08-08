import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { colors, controlHeights, radii, shadows } from '@/design/tokens';

type Props = Omit<PressableProps, 'children'> & {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  tone?: 'plain' | 'brand';
};

export function PillyIconButton({ icon, label, tone = 'plain', disabled, style, ...props }: Props) {
  const isDisabled = Boolean(disabled);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={6}
      style={(state) => [
        styles.base,
        tone === 'brand' ? styles.brand : styles.plain,
        state.pressed && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Ionicons
        name={icon}
        size={23}
        color={tone === 'brand' ? colors.surface : colors.textPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: controlHeights.medium,
    height: controlHeights.medium,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plain: { backgroundColor: 'transparent' },
  brand: { backgroundColor: colors.brand, ...shadows.soft },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.35 },
});
