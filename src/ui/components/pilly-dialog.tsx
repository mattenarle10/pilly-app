import type { PropsWithChildren } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows, spacing } from '@/ui/tokens';
import { PillyButton } from './pilly-button';
import { PillyIconButton } from './pilly-icon-button';
import { PillyText } from './pilly-text';

type Props = PropsWithChildren<{
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  footerAction?: {
    label: string;
    onPress: () => void;
  };
}>;

export function PillyDialog({ visible, title, message, onClose, footerAction, children }: Props) {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, spacing.xl);
  const paddingBottom = Math.max(insets.bottom, spacing.xl);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          {
            paddingTop,
            paddingBottom,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View accessibilityViewIsModal style={styles.dialog} testID="pilly-dialog">
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
            {!footerAction ? (
              <PillyIconButton icon="close" label="Close" onPress={onClose} />
            ) : null}
          </View>
          <ScrollView
            alwaysBounceVertical={false}
            bounces={false}
            contentContainerStyle={[styles.body, footerAction && styles.bodyWithFooter]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.bodyViewport}
            testID="pilly-dialog-body"
          >
            {children}
          </ScrollView>
          {footerAction ? (
            <View style={styles.footer}>
              <PillyButton
                label={footerAction.label}
                variant="quiet"
                size="medium"
                tone="brand"
                onPress={footerAction.onPress}
              />
            </View>
          ) : null}
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
  bodyViewport: { flexGrow: 0, flexShrink: 1 },
  body: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  bodyWithFooter: { paddingBottom: 0 },
  footer: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
});
