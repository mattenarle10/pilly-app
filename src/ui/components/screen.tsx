import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '@/ui/tokens';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
  footer?: ReactNode;
  overlay?: ReactNode;
  safeAreaEdges?: readonly Edge[];
  contentInsetAdjustmentBehavior?: ScrollViewProps['contentInsetAdjustmentBehavior'];
}>;
const defaultEdges = ['top', 'bottom'] as const;

export function Screen({
  children,
  scroll = true,
  contentStyle,
  footer,
  overlay,
  safeAreaEdges = defaultEdges,
  contentInsetAdjustmentBehavior = 'automatic',
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const content = <View style={[styles.content, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView collapsable={false} edges={safeAreaEdges} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
      {overlay ? (
        <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + spacing.sm }]}>
          {overlay}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  overlay: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
    alignItems: 'flex-end',
  },
});
