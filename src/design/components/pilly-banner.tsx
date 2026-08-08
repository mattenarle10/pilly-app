import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { PillyButton } from './pilly-button';
import { PillyText } from './pilly-text';
import { colors, radii, spacing } from '@/design/tokens';

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
  info: 'information-circle-outline',
  warning: 'alert-circle-outline',
  error: 'close-circle-outline',
  success: 'checkmark-circle-outline',
} as const;

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
      <Ionicons name={icons[kind]} size={22} color={foregrounds[kind]} />
      <View style={styles.copy}>
        {title ? <PillyText role="headline">{title}</PillyText> : null}
        <PillyText role="caption">{message}</PillyText>
        {actionLabel && onAction ? (
          <PillyButton
            label={actionLabel}
            variant="quiet"
            size="compact"
            onPress={onAction}
            style={styles.action}
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
  compact: { paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  action: { alignSelf: 'flex-start', marginLeft: -spacing.md },
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
