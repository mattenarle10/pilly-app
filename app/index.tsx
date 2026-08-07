import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/design/tokens';
import { useRepository } from '@/providers';

export default function IndexRoute() {
  const repository = useRepository();
  const onboarding = useQuery({
    queryKey: ['settings', 'onboarding'],
    queryFn: () => repository.getSetting('hasCompletedOnboarding'),
    networkMode: 'always',
    staleTime: Infinity,
  });
  if (onboarding.isPending)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  return <Redirect href={onboarding.data === 'true' ? '/(tabs)/today' : '/(onboarding)/welcome'} />;
}
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
