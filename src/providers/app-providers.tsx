import { type PropsWithChildren, Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { migrateDatabase } from '@/storage/migrate-database';
import { colors } from '@/ui/tokens';

import { PlusEntitlementSync } from './plus-entitlement-sync';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const onChange = (status: AppStateStatus) => focusManager.setFocused(status === 'active');
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  return (
    <Suspense
      fallback={
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
        </View>
      }
    >
      <SQLiteProvider databaseName="pilly.db" onInit={migrateDatabase} useSuspense>
        <QueryClientProvider client={queryClient}>
          <PlusEntitlementSync />
          {children}
        </QueryClientProvider>
      </SQLiteProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
