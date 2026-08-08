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
      <PillyText role="headline" accessibilityRole="header">
        pilly
      </PillyText>
      <View style={styles.center}>
        <WeeklyOrganizer days={days} presentation="welcome" height={230} />
        <View style={styles.copy}>
          <PillyText role="large-title" accessibilityRole="header">
            What’s next. What’s left.
          </PillyText>
          <PillyText muted>Private on this iPhone.</PillyText>
        </View>
      </View>
      <PillyButton
        label="Get started"
        icon="next"
        fullWidth
        onPress={() => router.push('/(onboarding)/start-small')}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center' },
  copy: { gap: spacing.md },
});
