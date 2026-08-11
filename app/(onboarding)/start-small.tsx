import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PillyButton, PillyIconTile, PillyText, Screen } from '@/ui/components';
import type { PillyIconName } from '@/ui/icons';
import { spacing } from '@/ui/tokens';
import { useRepository } from '@/hooks';

export default function StartSmallRoute() {
  const router = useRouter();
  const repository = useRepository();
  const queryClient = useQueryClient();
  const complete = useMutation({
    mutationFn: () => repository.setSetting('hasCompletedOnboarding', 'true'),
    networkMode: 'always',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'onboarding'] }),
  });

  const finish = async (addMedicine: boolean) => {
    await complete.mutateAsync();
    router.replace(addMedicine ? '/medicine/new' : '/(tabs)/today');
  };

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.center}>
        <View style={styles.steps}>
          <SetupItem icon="medicine" label="Name" />
          <SetupItem icon="calendar" label="Days" />
          <SetupItem icon="time" label="Time" />
        </View>
        <View style={styles.copy}>
          <PillyText role="large-title" accessibilityRole="header">
            Start with one medicine
          </PillyText>
          <PillyText muted>Name, days, and time. That’s it.</PillyText>
        </View>
      </View>
      <View style={styles.actions}>
        <PillyButton
          label="Add medicine"
          icon="add"
          fullWidth
          disabled={complete.isPending}
          onPress={() => finish(true)}
        />
        <PillyButton
          label="Skip"
          variant="quiet"
          disabled={complete.isPending}
          onPress={() => finish(false)}
        />
      </View>
    </Screen>
  );
}

function SetupItem({ icon, label }: { icon: PillyIconName; label: string }) {
  return (
    <View style={styles.step}>
      <PillyIconTile icon={icon} />
      <PillyText role="caption">{label}</PillyText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center' },
  copy: { gap: spacing.md },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  step: { alignItems: 'center', gap: spacing.sm },
  actions: { gap: spacing.sm },
});
