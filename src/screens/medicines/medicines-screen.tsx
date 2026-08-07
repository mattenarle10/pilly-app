import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { PillyButton, PillyText, Screen } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { useRepository } from '@/providers';

export function MedicinesScreen() {
  const repository = useRepository();
  const query = useQuery({
    queryKey: ['medications'],
    queryFn: () => repository.listMedications(),
    networkMode: 'always',
  });
  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <PillyText role="large-title">Medicines</PillyText>
          <PillyText muted>Schedules and supply saved on this iPhone.</PillyText>
        </View>
        <PillyButton label="Add" onPress={() => router.push('/medicine/new')} />
      </View>
      {query.data?.length === 0 ? (
        <View style={styles.empty}>
          <PillyText role="headline">No medicines yet.</PillyText>
          <PillyText muted>Add the first one from its label.</PillyText>
          <PillyButton label="Add medicine" onPress={() => router.push('/medicine/new')} />
        </View>
      ) : null}
      <View style={styles.list}>
        {query.data?.map((medicine) => (
          <View key={medicine.id} style={styles.card}>
            <View style={styles.dot} />
            <View style={styles.copy}>
              <PillyText role="headline">{medicine.name}</PillyText>
              <PillyText muted>{medicine.instructions || 'No instruction added'}</PillyText>
              {medicine.supplyCount !== null ? (
                <PillyText role="caption" muted>
                  {medicine.supplyCount} doses entered
                </PillyText>
              ) : null}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.plus}>
        <PillyText role="headline">Make it feel more like yours</PillyText>
        <PillyText muted>
          Pilly Plus adds themes, alternate icons, CSV export, and a printable medicine plan. The
          core tracker stays free.
        </PillyText>
        <PillyButton
          label="See Pilly Plus"
          variant="secondary"
          onPress={() => router.push('/plus')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  headerCopy: { flex: 1, gap: spacing.xs },
  empty: {
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 20,
  },
  list: { gap: spacing.md },
  card: {
    minHeight: 88,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.peach },
  copy: { flex: 1, gap: spacing.xs },
  plus: {
    gap: spacing.lg,
    padding: spacing.xl,
    marginTop: spacing.xxxl,
    borderRadius: 22,
    backgroundColor: colors.lavenderSoft,
  },
});
