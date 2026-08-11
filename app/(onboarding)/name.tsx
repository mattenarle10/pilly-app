import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { useProfileName } from '@/hooks';
import {
  MedicationAppearance,
  PillyBanner,
  PillyButton,
  PillyField,
  PillyText,
  Screen,
} from '@/ui/components';
import { colors, spacing } from '@/ui/tokens';

export default function OnboardingNameRoute() {
  const router = useRouter();
  const profile = useProfileName();
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    if (!profile.isLoading && profile.displayName) {
      router.replace('/(onboarding)/start-small');
    }
  }, [profile.displayName, profile.isLoading, router]);

  const continueWithoutName = () => router.replace('/(onboarding)/start-small');
  const saveAndContinue = () => {
    profile.saveName.reset();
    profile.saveName.mutate(
      { firstName, lastName: '' },
      { onSuccess: () => router.replace('/(onboarding)/start-small') },
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerBackButtonMenuEnabled: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          title: '',
        }}
      />
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
          <View style={styles.composition}>
            <View style={styles.medicineMark}>
              <MedicationAppearance
                shape="capsule"
                size="large"
                tone="rose"
                secondaryTone="peach"
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

            <PillyField
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
          </View>
        )}
      </Screen>
    </>
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
  medicineMark: { alignItems: 'flex-start', marginBottom: -spacing.sm },
  copy: { gap: spacing.md },
  body: { maxWidth: 340 },
  actions: { alignItems: 'center', gap: spacing.md },
  primaryAction: { width: 210, maxWidth: '100%' },
});
