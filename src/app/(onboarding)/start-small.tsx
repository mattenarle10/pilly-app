import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { queryKeys } from '@/hooks/query-keys';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyButton } from '@/ui/components/pilly-button';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { useRepository } from '@/hooks/use-repository';
import { OnboardingJourney } from '@/ui/illustrations';
import { motionDelays, motionDurations, spacing } from '@/ui/tokens';

export default function StartSmallRoute() {
  const router = useRouter();
  const repository = useRepository();
  const queryClient = useQueryClient();
  const complete = useMutation({
    mutationFn: () => repository.setSetting('hasCompletedOnboarding', 'true'),
    networkMode: 'always',
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.setting('hasCompletedOnboarding') }),
  });

  const finish = async (addMedicine: boolean) => {
    complete.reset();
    try {
      await complete.mutateAsync();
      router.dismissTo(addMedicine ? '/medicine/new' : '/(tabs)/today');
    } catch {
      // The mutation error is rendered beside the actions so the user can retry.
    }
  };

  return (
    <Screen
      safeAreaEdges={['bottom']}
      contentInsetAdjustmentBehavior="never"
      contentStyle={styles.content}
    >
      <View style={styles.hero}>
        <OnboardingJourney stage="setup" />
        <Animated.View
          entering={FadeIn.delay(motionDelays.contentEntrance)
            .duration(motionDurations.contentEntrance)
            .reduceMotion(ReduceMotion.System)}
          style={styles.contentGroup}
        >
          <View style={styles.copy}>
            <PillyText role="large-title" accessibilityRole="header" maxFontSizeMultiplier={2}>
              Start with one medicine
            </PillyText>
            <PillyText muted maxFontSizeMultiplier={2} style={styles.body}>
              Add its name, days, and time. You can change everything later.
            </PillyText>
          </View>
          <View style={styles.actions}>
            <PillyButton
              label="Add first medicine"
              icon="add"
              size="medium"
              loading={complete.isPending}
              onPress={() => finish(true)}
              style={styles.primaryAction}
            />
            <PillyButton
              label="Not now"
              variant="quiet"
              size="compact"
              disabled={complete.isPending}
              onPress={() => finish(false)}
            />
            {complete.isError ? (
              <PillyBanner compact kind="error" message="Couldn’t finish setup. Try again." />
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: '100%' },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.xxl, paddingVertical: spacing.xl },
  contentGroup: { gap: spacing.xxl },
  copy: { alignItems: 'center', gap: spacing.md },
  body: { maxWidth: 330, textAlign: 'center' },
  actions: { width: '100%', alignItems: 'center', gap: spacing.md },
  primaryAction: { width: 260, maxWidth: '100%' },
});
