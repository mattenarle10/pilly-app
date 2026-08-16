import type { PropsWithChildren } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows, spacing } from '@/ui/tokens';
import { PillyIconButton } from './pilly-icon-button';
import { PillyText } from './pilly-text';

type Props = PropsWithChildren<{
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
}>;

export function PillyDialog({ visible, title, message, onClose, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          {
            paddingTop: Math.max(insets.top, spacing.xl),
            paddingBottom: Math.max(insets.bottom, spacing.xl),
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.copy}>
              <PillyText role="title" accessibilityRole="header">
                {title}
              </PillyText>
              {message ? (
                <PillyText role="caption" muted>
                  {message}
                </PillyText>
              ) : null}
            </View>
            <PillyIconButton icon="close" label="Close" onPress={onClose} />
          </View>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(43,35,39,0.36)',
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '84%',
    gap: spacing.lg,
    paddingTop: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  copy: { flex: 1, gap: spacing.xs },
  body: {
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
