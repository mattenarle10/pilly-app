import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PillyButton, PillyText, Screen } from '@/ui/components';
import { PillyIcon } from '@/ui/icons';
import { OnboardingJourney } from '@/ui/illustrations';
import { colors, spacing } from '@/ui/tokens';

export default function WelcomeRoute() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <OnboardingJourney stage="welcome" />
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
        <PillyButton
          label="Continue"
          icon="next"
          size="medium"
          onPress={() => router.push('/(onboarding)/start-small')}
          style={styles.primaryAction}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: '100%' },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.xxl, paddingVertical: spacing.xxl },
  copy: { alignItems: 'center', gap: spacing.md },
  body: { maxWidth: 330, textAlign: 'center' },
  privacy: {
    maxWidth: 330,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryAction: { width: 210, alignSelf: 'center', marginTop: spacing.sm },
});
