import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, shadows, spacing } from '@/ui/tokens';

type Props = PropsWithChildren<
  ViewProps & { tone?: 'plain' | 'peach' | 'lavender'; padding?: 'none' | 'medium' | 'large' }
>;

export function PillyCard({ children, tone = 'plain', padding = 'large', style, ...props }: Props) {
  return (
    <View
      style={[
        styles.base,
        tones[tone],
        padding === 'none' ? undefined : padding === 'large' ? styles.large : styles.medium,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.lg },
  medium: { padding: spacing.lg },
  large: { padding: spacing.xl },
});
const tones = StyleSheet.create({
  plain: { backgroundColor: colors.glass, ...shadows.soft },
  peach: { backgroundColor: colors.peachSoft },
  lavender: { backgroundColor: colors.lavenderSoft },
});
