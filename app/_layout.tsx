import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppRuntime } from '@/core';
import { colors } from '@/design/tokens';

export default function RootLayout() {
  return (
    <AppRuntime>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </AppRuntime>
  );
}
