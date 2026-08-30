import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/app-providers';
import { configureNotificationPresentation } from '@/services/notifications';
import { colors } from '@/ui/tokens';

configureNotificationPresentation();

const standardHeaderOptions = {
  headerShown: true,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerBackButtonMenuEnabled: false,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerTitleAlign: 'center' as const,
  headerTitleStyle: { color: colors.textPrimary, fontWeight: '600' as const },
};

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="medicine/new"
          options={{
            ...standardHeaderOptions,
            title: 'Add medicine',
          }}
        />
        <Stack.Screen
          name="medicine/[id]/edit"
          options={{
            ...standardHeaderOptions,
            title: 'Edit medicine',
          }}
        />
        <Stack.Screen
          name="profile/index"
          options={{ ...standardHeaderOptions, title: 'Profile' }}
        />
        <Stack.Screen
          name="account/index"
          options={{ ...standardHeaderOptions, title: 'Pilly Plus account' }}
        />
        <Stack.Screen
          name="plus/index"
          options={{ ...standardHeaderOptions, title: 'Pilly Plus' }}
        />
      </Stack>
    </AppProviders>
  );
}
