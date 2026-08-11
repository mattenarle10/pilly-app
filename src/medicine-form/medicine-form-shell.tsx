import type { ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Stack } from 'expo-router';

import { PillyText, Screen } from '@/design/components';
import { colors, spacing } from '@/design/tokens';

type Props = {
  title: string;
  actionLabel: string;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  onAction: () => void;
  scrollRef?: Ref<ScrollView>;
  children: ReactNode;
  modal?: ReactNode;
};

export function MedicineFormShell({
  title,
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
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerBackButtonMenuEnabled: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleAlign: 'center',
          headerTitleStyle: { color: colors.textPrimary, fontWeight: '600' },
          title,
          headerRight: () => (
            <HeaderAction
              label={actionLabel}
              loading={actionLoading}
              disabled={actionDisabled}
              onPress={onAction}
            />
          ),
        }}
      />
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

function HeaderAction({
  label,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerAction,
        pressed && styles.headerActionPressed,
        (disabled || loading) && styles.headerActionDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.brand} />
      ) : (
        <PillyText role="label" style={styles.headerActionLabel}>
          {label}
        </PillyText>
      )}
    </Pressable>
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
  headerAction: {
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerActionLabel: { color: colors.brand },
  headerActionPressed: { opacity: 0.72 },
  headerActionDisabled: { opacity: 0.42 },
});
