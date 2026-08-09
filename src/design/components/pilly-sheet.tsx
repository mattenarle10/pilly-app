import type { PropsWithChildren } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { ReduceMotion, SlideInDown } from 'react-native-reanimated';

import { colors, radii, spacing } from '@/design/tokens';
import { PillyIconButton } from './pilly-icon-button';
import { PillyText } from './pilly-text';

type Props = PropsWithChildren<{
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
}>;

export function PillySheet({ visible, title, message, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Animated.View
          entering={SlideInDown.duration(220).reduceMotion(ReduceMotion.System)}
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
        >
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(43,35,39,0.36)',
  },
  sheet: {
    maxHeight: '84%',
    gap: spacing.xl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  body: { gap: spacing.xl },
});
