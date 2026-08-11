import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PillyButton } from './pilly-button';
import { PillyCard } from './pilly-card';
import { PillyText } from './pilly-text';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { colors, radii, spacing } from '@/ui/tokens';

type Props = {
  icon?: PillyIconName;
  illustration?: ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  actionIcon?: PillyIconName;
  onAction?: () => void;
};
export function EmptyState({
  icon,
  illustration,
  title,
  message,
  actionLabel,
  actionIcon = 'add',
  onAction,
}: Props) {
  return (
    <PillyCard style={styles.card}>
      {illustration ? (
        <View style={styles.illustration}>{illustration}</View>
      ) : icon ? (
        <View style={styles.icon}>
          <PillyIcon name={icon} size={26} color={colors.brand} />
        </View>
      ) : null}
      <PillyText role="headline" style={styles.centeredCopy}>
        {title}
      </PillyText>
      {message ? (
        <PillyText muted style={styles.centeredCopy}>
          {message}
        </PillyText>
      ) : null}
      {actionLabel && onAction ? (
        <PillyButton label={actionLabel} icon={actionIcon} onPress={onAction} fullWidth />
      ) : null}
    </PillyCard>
  );
}
const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.md },
  illustration: { width: '100%' },
  centeredCopy: { textAlign: 'center' },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
