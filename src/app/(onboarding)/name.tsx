import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { useProfileName } from '@/hooks/use-profile';
import { MedicationAppearance } from '@/ui/components/medication-appearance';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyButton } from '@/ui/components/pilly-button';
import { PillyField } from '@/ui/components/pilly-field';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { colors, motionDurations, spacing } from '@/ui/tokens';

export default function OnboardingNameRoute() {
  const router = useRouter();
  const profile = useProfileName();
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    if (!profile.isLoading && profile.displayName && profile.saveName.isIdle) {
      router.replace('/(onboarding)/start-small');
    }
  }, [profile.displayName, profile.isLoading, profile.saveName.isIdle, router]);

  const continueWithoutName = () => router.push('/(onboarding)/start-small');
  const saveAndContinue = () => {
    profile.saveName.reset();
    profile.saveName.mutate(
      { firstName, lastName: '' },
      { onSuccess: () => router.push('/(onboarding)/start-small') },
    );
  };

  return (
    <Screen
      safeAreaEdges={['bottom']}
      contentInsetAdjustmentBehavior="never"
      contentStyle={styles.screen}
    >
      {profile.isLoading || profile.displayName ? (
        <View accessibilityLabel="Loading your profile" style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(motionDurations.contentEntrance).reduceMotion(
            ReduceMotion.System,
          )}
          style={styles.composition}
        >
          <View style={styles.intro}>
            <View style={styles.medicineMark}>
              <MedicationAppearance
                shape="capsule"
                size="large"
                color="#F3CCD7"
                secondaryColor="#FBE9DE"
              />
            </View>
            <View style={styles.copy}>
              <PillyText role="large-title" accessibilityRole="header" maxFontSizeMultiplier={2}>
                What should Pilly call you?
              </PillyText>
              <PillyText muted maxFontSizeMultiplier={2} style={styles.body}>
                Your first name makes Today feel personal. It stays on this iPhone.
              </PillyText>
            </View>
          </View>

          <PillyField
            testID="onboarding-first-name"
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            autoCapitalize="words"
            autoComplete="name-given"
            enterKeyHint="done"
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={firstName.trim() ? saveAndContinue : undefined}
          />

          <View style={styles.actions}>
            <PillyButton
              label="Continue"
              icon="next"
              size="medium"
              disabled={!firstName.trim()}
              loading={profile.saveName.isPending}
              onPress={saveAndContinue}
              style={styles.primaryAction}
            />
            <PillyButton
              label="Skip for now"
              variant="quiet"
              size="compact"
              disabled={profile.saveName.isPending}
              onPress={continueWithoutName}
            />
            {profile.isError ? (
              <PillyBanner
                compact
                kind="error"
                message="Couldn’t check your saved profile. You can still continue."
                actionLabel="Try again"
                onAction={() => void profile.retry()}
              />
            ) : profile.saveName.isError ? (
              <PillyBanner compact kind="error" message="Couldn’t save your name. Try again." />
            ) : null}
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { minHeight: '100%' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  composition: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  intro: { gap: spacing.lg },
  medicineMark: { alignItems: 'flex-start' },
  copy: { gap: spacing.md },
  body: { maxWidth: 340 },
  actions: { alignItems: 'center', gap: spacing.md },
  primaryAction: { width: 210, maxWidth: '100%' },
});
