import { type PropsWithChildren, Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { migrateDatabase } from '@/storage/migrate-database';
import { colors } from '@/ui/tokens';

import { AccountSessionProvider } from './account-session-provider';
import { CloudSyncProvider } from './cloud-sync-provider';
import { PlusEntitlementSync } from './plus-entitlement-sync';
import { WidgetSync } from './widget-sync';

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
      <SQLiteProvider
        databaseName="pilly.db"
        options={{ enableChangeListener: true }}
        onInit={migrateDatabase}
        useSuspense
      >
        <QueryClientProvider client={queryClient}>
          <AccountSessionProvider>
            <CloudSyncProvider>
              <PlusEntitlementSync />
              <WidgetSync />
              {children}
            </CloudSyncProvider>
          </AccountSessionProvider>
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
