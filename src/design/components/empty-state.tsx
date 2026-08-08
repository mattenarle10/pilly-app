import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { PillyButton } from './pilly-button';
import { PillyCard } from './pilly-card';
import { PillyText } from './pilly-text';
import { colors, radii, spacing } from '@/design/tokens';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};
export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <PillyCard style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={26} color={colors.brand} />
      </View>
      <PillyText role="headline">{title}</PillyText>
      {message ? <PillyText muted>{message}</PillyText> : null}
      {actionLabel && onAction ? (
        <PillyButton label={actionLabel} icon="add" onPress={onAction} fullWidth />
      ) : null}
    </PillyCard>
  );
}
const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.md },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
