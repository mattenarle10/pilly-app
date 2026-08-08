import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PillyButton, PillyText, Screen } from '@/design/components';
import { WeeklyOrganizer, type OrganizerDay } from '@/design/illustrations';
import { spacing } from '@/design/tokens';
import { useRepository } from '@/providers';

const days: OrganizerDay[] = Array.from({ length: 7 }, (_, index) => ({
  key: `${index}`,
  label: '',
  state: 'empty',
}));
export function StartSmallScreen() {
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
        <WeeklyOrganizer days={days} height={210} />
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
const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center' },
  copy: { gap: spacing.md },
  actions: { gap: spacing.sm },
});
