import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
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
  onShow?: () => void;
  dismissible?: boolean;
  keyboardAware?: boolean;
  actions?: readonly {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
    tone?: 'default' | 'brand';
    loading?: boolean;
    disabled?: boolean;
  }[];
}>;

export function PillyDialog({
  visible,
  title,
  message,
  onClose,
  onShow,
  dismissible = true,
  keyboardAware = false,
  actions = [],
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const paddingTop = Math.max(insets.top, spacing.xl);
  const paddingBottom = Math.max(insets.bottom, spacing.xl);
  const hasActions = actions.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (dismissible) onClose();
      }}
      onShow={onShow}
    >
      <KeyboardAvoidingView
        behavior={keyboardAware ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined}
        enabled={keyboardAware}
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
          disabled={!dismissible}
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
            {!hasActions ? <PillyIconButton icon="close" label="Close" onPress={onClose} /> : null}
          </View>
          <ScrollView
            alwaysBounceVertical={false}
            bounces={false}
            contentContainerStyle={[styles.body, hasActions && styles.bodyWithFooter]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.bodyViewport}
            testID="pilly-dialog-body"
          >
            {children}
          </ScrollView>
          {hasActions ? (
            <View style={[styles.footer, fontScale >= 1.3 && styles.footerLarge]}>
              {actions.map((action) => (
                <PillyButton
                  key={action.label}
                  label={action.label}
                  variant={action.variant ?? 'primary'}
                  size="medium"
                  tone={action.tone}
                  loading={action.loading}
                  disabled={action.disabled}
                  onPress={action.onPress}
                  fullWidth={fontScale >= 1.3}
                  style={fontScale < 1.3 ? styles.footerAction : undefined}
                />
              ))}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  footerLarge: { flexDirection: 'column' },
  footerAction: { minWidth: 120 },
});
