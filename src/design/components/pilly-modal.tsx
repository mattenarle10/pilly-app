import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PillyButton } from './pilly-button';
import { PillyText } from './pilly-text';
import { colors, radii, spacing } from '@/design/tokens';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function PillyModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onClose,
}: Props) {
  const { fontScale } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close dialog"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.copy}>
            <PillyText role="title" accessibilityRole="header">
              {title}
            </PillyText>
            <PillyText muted>{message}</PillyText>
          </View>
          <View style={[styles.actions, fontScale >= 1.3 && styles.actionsLarge]}>
            <PillyButton
              label={cancelLabel}
              variant="secondary"
              onPress={onClose}
              style={fontScale < 1.3 ? styles.action : undefined}
              fullWidth={fontScale >= 1.3}
            />
            <PillyButton
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={fontScale < 1.3 ? styles.action : undefined}
              fullWidth={fontScale >= 1.3}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.xl,
    backgroundColor: 'rgba(43,35,39,0.42)',
  },
  card: {
    gap: spacing.xxl,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  copy: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionsLarge: { flexDirection: 'column' },
  action: { flex: 1 },
});
