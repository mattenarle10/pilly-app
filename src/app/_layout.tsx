import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/app-providers';
import { configureNotificationPresentation } from '@/services/notifications';
import { standardHeaderOptions } from '@/ui/navigation';
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
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
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
          name="medicines/archived"
          options={{ ...standardHeaderOptions, title: 'Archived medicines' }}
        />
        <Stack.Screen
          name="profile/index"
          options={{ ...standardHeaderOptions, title: 'Profile' }}
        />
        <Stack.Screen
          name="account/index"
          options={{ ...standardHeaderOptions, title: 'Account' }}
        />
        <Stack.Screen
          name="plus/index"
          options={{ ...standardHeaderOptions, title: 'Pilly Plus' }}
        />
      </Stack>
    </AppProviders>
  );
}
