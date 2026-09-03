import { Stack } from 'expo-router';

import { standardHeaderOptions } from '@/ui/navigation';
import { colors } from '@/ui/tokens';

export const unstable_settings = {
  initialRouteName: 'welcome',
};

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        ...standardHeaderOptions,
        animation: 'default',
        animationTypeForReplace: 'push',
        contentStyle: { backgroundColor: colors.background },
        title: '',
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="name" />
      <Stack.Screen name="start-small" />
    </Stack>
  );
}
