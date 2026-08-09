import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { PillyButton } from './pilly-button';
import { PillySheet } from './pilly-sheet';
import { spacing } from '@/design/tokens';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function PillyModal({
  visible,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  confirmLoading,
  onConfirm,
  onClose,
}: Props) {
  const { fontScale } = useWindowDimensions();
  return (
    <PillySheet visible={visible} title={title} message={message} onClose={onClose}>
      {children}
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
          loading={confirmLoading}
          onPress={onConfirm}
          style={fontScale < 1.3 ? styles.action : undefined}
          fullWidth={fontScale >= 1.3}
        />
      </View>
    </PillySheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.md },
  actionsLarge: { flexDirection: 'column' },
  action: { flex: 1 },
});
