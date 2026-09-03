import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { colors, controlHeights, radii, shadows } from '@/ui/tokens';

type Props = Omit<PressableProps, 'children'> & {
  icon: PillyIconName;
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
      {(state) => (
        <PillyIcon
          name={icon}
          size={23}
          active={state.pressed}
          color={tone === 'brand' ? colors.surface : colors.textPrimary}
        />
      )}
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
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.35 },
});
