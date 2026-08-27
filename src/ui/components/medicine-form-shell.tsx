import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';

import { Screen } from './screen';
import { colors, spacing } from '@/ui/tokens';

type Props = {
  actionLabel: string;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  onAction: () => void;
  scrollRef?: Ref<ScrollView>;
  children: ReactNode;
  modal?: ReactNode;
};

export function MedicineFormShell({
  actionLabel,
  actionDisabled = false,
  actionLoading = false,
  onAction,
  scrollRef,
  children,
  modal,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={actionLoading ? `${actionLabel}, in progress` : actionLabel}
          disabled={actionDisabled || actionLoading}
          tintColor={colors.brand}
          variant="done"
          onPress={onAction}
        >
          {actionLabel}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Screen scroll={false} safeAreaEdges={['bottom']} contentStyle={styles.screen}>
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.formContent, { width: windowWidth }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.formViewport}
        >
          {children}
        </ScrollView>
        {modal}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: spacing.sm },
  formViewport: { flex: 1 },
  formContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});
