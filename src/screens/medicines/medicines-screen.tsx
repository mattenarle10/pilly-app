import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import {
  EmptyState,
  PillyBanner,
  PillyButton,
  PillyCard,
  PillyIconButton,
  PillyIconTile,
  PillyText,
  Screen,
} from '@/design/components';
import { PillyIcon } from '@/design/icons';
import { colors, spacing } from '@/design/tokens';
import { useRepository } from '@/hooks';

export function MedicinesScreen() {
  const repository = useRepository();
  const query = useQuery({
    queryKey: ['medications'],
    queryFn: () => repository.listMedications({ includeArchived: true }),
    networkMode: 'always',
  });
  return (
    <Screen safeAreaEdges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <PillyText role="large-title">Medicines</PillyText>
          <PillyText role="caption" muted>
            Saved on this iPhone
          </PillyText>
        </View>
        <PillyIconButton
          icon="add"
          label="Add medicine"
          tone="brand"
          onPress={() => router.push('/medicine/new')}
        />
      </View>
      {query.isError ? (
        <PillyBanner
          kind="error"
          title="Couldn’t load medicines"
          message="Your saved data is still here."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {query.data?.length === 0 ? (
        <EmptyState
          icon="medicine"
          title="No medicines yet"
          message="Start with the label in front of you."
          actionLabel="Add medicine"
          onAction={() => router.push('/medicine/new')}
        />
      ) : null}
      <View style={styles.list}>
        {query.data?.map((medicine) => (
          <Pressable
            key={medicine.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${medicine.name}`}
            onPress={() => router.push({ pathname: '/medicine/[id]', params: { id: medicine.id } })}
          >
            <PillyCard padding="medium" style={styles.card}>
              <PillyIconTile icon="medicineDose" tone="peach" />
              <View style={styles.copy}>
                <PillyText role="headline">{medicine.name}</PillyText>
                {medicine.instructions ? (
                  <PillyText role="caption" muted>
                    {medicine.instructions}
                  </PillyText>
                ) : null}
                <PillyText role="caption" muted>
                  {medicine.archivedAt
                    ? 'Archived'
                    : medicine.supplyCount === null
                      ? 'Supply not tracked'
                      : `${medicine.supplyCount} doses left`}
                </PillyText>
              </View>
              <PillyIcon name="next" size={20} color={colors.textSecondary} />
            </PillyCard>
          </Pressable>
        ))}
      </View>
      <PillyCard tone="lavender" style={styles.plus}>
        <View style={styles.plusTitle}>
          <PillyIcon name="palette" size={22} color={colors.brand} />
          <PillyText role="headline">Pilly Plus</PillyText>
        </View>
        <PillyText role="caption" muted>
          Themes, icons, print, and CSV.
        </PillyText>
        <PillyButton
          label="View Plus"
          icon="next"
          size="medium"
          variant="secondary"
          onPress={() => router.push('/plus')}
          fullWidth
        />
      </PillyCard>
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
  list: { gap: spacing.md },
  card: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  plus: { gap: spacing.md, marginTop: spacing.xxxl },
  plusTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
