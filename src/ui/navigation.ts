import { colors } from '@/ui/tokens';

export const standardHeaderOptions = {
  headerShown: true,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerBackButtonMenuEnabled: false,
  headerBackAccessibilityLabel: 'Back',
  headerBackTestID: 'BackButton',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerTitleAlign: 'center' as const,
  headerTitleStyle: { color: colors.textPrimary, fontWeight: '600' as const },
};
