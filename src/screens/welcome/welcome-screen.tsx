import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PillyButton, PillyText, Screen } from '@/design/components';
import { WeeklyOrganizer, type OrganizerDay } from '@/design/illustrations';
import { spacing } from '@/design/tokens';

const days: OrganizerDay[] = Array.from({ length: 7 }, (_, index) => ({
  key: `${index}`,
  label: '',
  state: 'empty',
}));
export function WelcomeScreen() {
  const router = useRouter();
  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <PillyText role="title" accessibilityRole="header">
        pilly
      </PillyText>
      <View style={styles.center}>
        <WeeklyOrganizer days={days} presentation="welcome" height={230} />
        <View style={styles.copy}>
          <PillyText role="large-title" accessibilityRole="header">
            Your medicines and what you have left.
          </PillyText>
          <PillyText muted>No account needed. Your information stays on this iPhone.</PillyText>
        </View>
      </View>
      <PillyButton label="Continue" onPress={() => router.push('/(onboarding)/start-small')} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center' },
  copy: { gap: spacing.md },
});
