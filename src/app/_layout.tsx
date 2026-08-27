import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/app-providers';
import { configureNotificationPresentation } from '@/services/notifications';
import { colors } from '@/ui/tokens';

configureNotificationPresentation();

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
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
            headerBackButtonMenuEnabled: false,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerTitleAlign: 'center',
            headerTitleStyle: { color: colors.textPrimary, fontWeight: '600' },
            title: 'Add medicine',
          }}
        />
        <Stack.Screen
          name="medicine/[id]/edit"
          options={{
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
            headerBackButtonMenuEnabled: false,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerTitleAlign: 'center',
            headerTitleStyle: { color: colors.textPrimary, fontWeight: '600' },
            title: 'Edit medicine',
          }}
        />
      </Stack>
    </AppProviders>
  );
}
