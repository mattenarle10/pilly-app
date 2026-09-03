import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { PillyButton } from '@/ui/components/pilly-button';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { PillyIcon } from '@/ui/icons';
import { OnboardingJourney } from '@/ui/illustrations';
import { colors, motionDelays, motionDurations, spacing } from '@/ui/tokens';
import { isPlusPurchasesSupported } from '@/services/purchases';

export default function WelcomeRoute() {
  const router = useRouter();
  const plusSupported = isPlusPurchasesSupported();

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <OnboardingJourney stage="welcome" />
        <Animated.View
          entering={FadeIn.delay(motionDelays.contentEntrance)
            .duration(motionDurations.contentEntrance)
            .reduceMotion(ReduceMotion.System)}
          style={styles.contentGroup}
        >
          <View style={styles.copy}>
            <PillyText role="large-title" accessibilityRole="header" maxFontSizeMultiplier={2}>
              What’s next. What’s left.
            </PillyText>
            <PillyText muted maxFontSizeMultiplier={2} style={styles.body}>
              See what’s due, record today, and look ahead through the week.
            </PillyText>
            <View style={styles.privacy}>
              <PillyIcon name="private" size={16} color={colors.brand} />
              <PillyText role="caption" muted maxFontSizeMultiplier={2}>
                No account. Medicine data stays on this iPhone.
              </PillyText>
            </View>
          </View>
          <View style={styles.actions}>
            <PillyButton
              label="Continue"
              icon="next"
              size="medium"
              onPress={() => router.push('/(onboarding)/name')}
              style={styles.primaryAction}
            />
            {plusSupported ? (
              <PillyButton
                label="See Pilly Plus"
                icon="favorite"
                variant="quiet"
                size="compact"
                tone="brand"
                onPress={() => router.push('/plus')}
              />
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: '100%' },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.xxl, paddingVertical: spacing.xxl },
  contentGroup: { gap: spacing.xxl },
  copy: { alignItems: 'center', gap: spacing.md },
  body: { maxWidth: 330, textAlign: 'center' },
  privacy: {
    maxWidth: 330,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actions: { alignItems: 'center', gap: spacing.sm },
  primaryAction: { width: 210 },
});
