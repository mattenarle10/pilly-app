import { StyleSheet, View } from 'react-native';

import { PillyButton } from './pilly-button';
import { PillyText } from './pilly-text';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { colors, radii, spacing } from '@/ui/tokens';

type Kind = 'info' | 'warning' | 'error' | 'success';
type Props = {
  kind?: Kind;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};
const icons = {
  info: 'info',
  warning: 'warning',
  error: 'error',
  success: 'success',
} as const satisfies Record<Kind, PillyIconName>;

export function PillyBanner({
  kind = 'info',
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: Props) {
  return (
    <View
      accessibilityRole="alert"
      style={[styles.base, compact && styles.compact, backgrounds[kind]]}
    >
      <PillyIcon name={icons[kind]} size={22} color={foregrounds[kind]} />
      <View style={[styles.copy, compact && styles.compactCopy]}>
        <View style={styles.text}>
          {title ? <PillyText role="headline">{title}</PillyText> : null}
          <PillyText role="caption">{message}</PillyText>
        </View>
        {actionLabel && onAction ? (
          <PillyButton
            label={actionLabel}
            variant="quiet"
            size="compact"
            onPress={onAction}
            style={compact ? styles.compactAction : styles.action}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  compact: { alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  compactCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { flex: 1, gap: spacing.xs },
  action: { alignSelf: 'flex-start', marginLeft: -spacing.md },
  compactAction: { alignSelf: 'center' },
});
const backgrounds = StyleSheet.create({
  info: { backgroundColor: colors.lavenderSoft },
  warning: { backgroundColor: colors.warningSoft },
  error: { backgroundColor: '#f9e4e4' },
  success: { backgroundColor: '#e4f2e9' },
});
const foregrounds: Record<Kind, string> = {
  info: colors.brand,
  warning: colors.warning,
  error: colors.danger,
  success: colors.success,
};
