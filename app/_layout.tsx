import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { migrateDatabase } from '@/data/database';
import { colors } from '@/design/tokens';
import { PillyQueryProvider, RepositoryProvider } from '@/providers';

export default function RootLayout() {
  return (
    <Suspense
      fallback={
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
        </View>
      }
    >
      <SQLiteProvider databaseName="pilly.db" onInit={migrateDatabase} useSuspense>
        <RepositoryProvider>
          <PillyQueryProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
          </PillyQueryProvider>
        </RepositoryProvider>
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
