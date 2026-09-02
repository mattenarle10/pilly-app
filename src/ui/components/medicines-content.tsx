import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  buildMedicineCollectionItems,
  type MedicineCollectionSort,
  type MedicineCollectionView,
} from '@/models/medicine-collection';
import type { Medication } from '@/models/medication';
import { PillyIcon } from '@/ui/icons';
import { StarterOrganizer } from '@/ui/illustrations/starter-organizer';
import { colors, radii, spacing } from '@/ui/tokens';
import { EmptyState } from './empty-state';
import { MedicineCabinetTile } from './medicine-cabinet-tile';
import { MedicineCollectionToolbar } from './medicine-collection-toolbar';
import { PillyBanner } from './pilly-banner';
import { PillyCard } from './pilly-card';
import { PillyIconButton } from './pilly-icon-button';
import { PillyText } from './pilly-text';

type MedicinesHeaderProps = {
  onAdd: () => void;
  showAdd?: boolean;
};

type MedicinesContentProps = {
  medicines: Medication[] | undefined;
  photoUris?: Readonly<Record<string, string | null | undefined>>;
  view: MedicineCollectionView;
  sort: MedicineCollectionSort;
  archived?: boolean;
  isLoading: boolean;
  isError: boolean;
  onAdd?: () => void;
  onRetry: () => void;
  onViewChange: (view: MedicineCollectionView) => void;
  onSortChange: (sort: MedicineCollectionSort) => void;
  onOpenMedicine: (medicineId: string) => void;
  onOpenArchived?: () => void;
};

export function MedicinesHeader({ onAdd, showAdd = true }: MedicinesHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <PillyText role="large-title" accessibilityRole="header">
          Medicines
        </PillyText>
        <PillyText role="caption" muted>
          Saved on this iPhone
        </PillyText>
      </View>
      {showAdd ? (
        <PillyIconButton icon="add" label="Add medicine" tone="brand" onPress={onAdd} />
      ) : null}
    </View>
  );
}

export function MedicinesContent({
  medicines,
  photoUris,
  view,
  sort,
  archived = false,
  isLoading,
  isError,
  onAdd,
  onRetry,
  onViewChange,
  onSortChange,
  onOpenMedicine,
  onOpenArchived,
}: MedicinesContentProps) {
  const { fontScale } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const columns = view === 'cabinet' && fontScale < 1.5 ? 2 : 1;
  const sectionCount = (medicines ?? []).filter(
    (medicine) => (medicine.archivedAt !== null) === archived,
  ).length;
  const archivedCount = (medicines ?? []).filter((medicine) => medicine.archivedAt !== null).length;
  const items = useMemo(
    () =>
      buildMedicineCollectionItems({
        medicines,
        photoUris,
        query,
        sort,
        archived,
      }),
    [archived, medicines, photoUris, query, sort],
  );

  if (isLoading && !medicines) {
    return (
      <PillyCard tone="lavender" padding="medium" style={styles.loadingState}>
        <ActivityIndicator color={colors.brand} />
        <PillyText role="caption" muted>
          Loading medicines…
        </PillyText>
      </PillyCard>
    );
  }

  if (isError && !medicines) {
    return (
      <EmptyState
        icon="error"
        title="Couldn’t load medicines"
        message="Your saved data is still on this iPhone."
        actionLabel="Try again"
        actionIcon="refresh"
        onAction={onRetry}
      />
    );
  }

  if (!archived && (!medicines || medicines.length === 0)) {
    return (
      <EmptyState
        illustration={<StarterOrganizer />}
        title="Your medicines live here"
        message="Add the first one from the label in front of you."
        actionLabel="Add medicine"
        onAction={onAdd}
      />
    );
  }

  if (archived && sectionCount === 0) {
    return (
      <EmptyState
        icon="archive"
        title="No archived medicines"
        message="Medicines you archive will stay available here."
      />
    );
  }

  return (
    <FlatList
      key={`${view}-${columns}`}
      accessibilityLabel={archived ? 'Archived medicines' : 'Active medicines'}
      data={items}
      numColumns={columns}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.collectionContent}
      columnWrapperStyle={columns === 2 ? styles.columns : undefined}
      ItemSeparatorComponent={() => <View style={styles.itemGap} />}
      ListHeaderComponent={
        <View style={styles.collectionHeader}>
          {isError ? (
            <PillyBanner
              kind="error"
              title="Couldn’t refresh medicines"
              message="Showing the last saved list."
              actionLabel="Try again"
              onAction={onRetry}
              compact
            />
          ) : null}
          <MedicineCollectionToolbar
            query={query}
            view={view}
            sort={sort}
            onQueryChange={setQuery}
            onViewChange={onViewChange}
            onSortChange={onSortChange}
          />
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyCollection}>
          <PillyText role="headline">{query ? 'No matches' : 'No active medicines'}</PillyText>
          <PillyText role="caption" muted>
            {query
              ? `No medicine names contain “${query.trim()}”.`
              : 'Add a medicine or open the archived shelf.'}
          </PillyText>
        </View>
      }
      ListFooterComponent={
        !archived && archivedCount > 0 && onOpenArchived ? (
          <ArchivedShelf count={archivedCount} onPress={onOpenArchived} />
        ) : null
      }
      renderItem={({ item }) => (
        <View style={[styles.item, columns === 2 && styles.gridItem]}>
          <MedicineCabinetTile item={item} layout={view} onPress={() => onOpenMedicine(item.id)} />
        </View>
      )}
    />
  );
}

function ArchivedShelf({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open archived medicines, ${count} ${count === 1 ? 'medicine' : 'medicines'}`}
      onPress={onPress}
      style={({ pressed }) => [styles.archivedShelf, pressed && styles.archivedShelfPressed]}
    >
      <PillyIcon name="archive" size={20} color={colors.textSecondary} />
      <PillyText role="label" style={styles.archivedLabel}>
        Archived
      </PillyText>
      <PillyText role="caption" muted>
        {count}
      </PillyText>
      <PillyIcon name="next" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerCopy: { flex: 1, gap: spacing.xs },
  loadingState: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  collectionContent: { flexGrow: 1, paddingBottom: spacing.xxxl },
  collectionHeader: { gap: spacing.md, marginBottom: spacing.md },
  columns: { gap: spacing.md },
  item: { flex: 1 },
  gridItem: { maxWidth: '48%' },
  itemGap: { height: spacing.md },
  emptyCollection: {
    gap: spacing.xs,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  archivedShelf: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  archivedShelfPressed: { backgroundColor: colors.surfaceSubtle },
  archivedLabel: { flex: 1 },
});
