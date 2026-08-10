import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import {
  EmptyState,
  MedicationAppearance,
  PillyBanner,
  PillyCard,
  PillyIconButton,
  PillyText,
  Screen,
} from '@/design/components';
import { PillyIcon } from '@/design/icons';
import { colors, spacing } from '@/design/tokens';
import { useRepository } from '@/hooks';

export default function MedicinesRoute() {
  const repository = useRepository();
  const query = useQuery({
    queryKey: ['medications'],
    queryFn: () => repository.listMedications({ includeArchived: true }),
    networkMode: 'always',
  });

  return (
    <Screen safeAreaEdges={['top']} contentStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <PillyText role="large-title" accessibilityRole="header">
            Medicines
          </PillyText>
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

      {query.data && query.data.length > 0 ? (
        <PillyCard padding="none" style={styles.listSurface}>
          {query.data.map((medicine, index) => (
            <View key={medicine.id}>
              {index > 0 ? <View style={styles.separator} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${medicine.name}`}
                onPress={() =>
                  router.push({ pathname: '/medicine/[id]', params: { id: medicine.id } })
                }
                style={({ pressed }) => [
                  styles.row,
                  medicine.archivedAt && styles.archivedRow,
                  pressed && styles.pressedRow,
                ]}
              >
                <MedicationAppearance
                  shape={medicine.appearanceShape}
                  size={medicine.appearanceSize}
                  tone={medicine.appearanceTone}
                  secondaryTone={medicine.appearanceSecondaryTone}
                  display="compact"
                />
                <View style={styles.copy}>
                  <PillyText role="headline" numberOfLines={2}>
                    {medicine.name}
                  </PillyText>
                  {medicine.instructions ? (
                    <PillyText role="caption" muted numberOfLines={1}>
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
              </Pressable>
            </View>
          ))}
        </PillyCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerCopy: { flex: 1, gap: spacing.xs },
  listSurface: { overflow: 'hidden' },
  row: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  archivedRow: { opacity: 0.58 },
  pressedRow: { backgroundColor: colors.surfaceSubtle },
  copy: { flex: 1, gap: spacing.xs },
  separator: {
    height: 1,
    marginLeft: 96,
    backgroundColor: colors.surfaceSubtle,
  },
});
