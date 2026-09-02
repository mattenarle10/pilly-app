import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { MedicineCollectionSort, MedicineCollectionView } from '@/models/medicine-collection';
import { PillyIcon } from '@/ui/icons';
import { colors, controlHeights, radii, spacing, typography } from '@/ui/tokens';
import { PillyText } from './pilly-text';

type Props = {
  query: string;
  view: MedicineCollectionView;
  sort: MedicineCollectionSort;
  onQueryChange: (query: string) => void;
  onViewChange: (view: MedicineCollectionView) => void;
  onSortChange: (sort: MedicineCollectionSort) => void;
};

export function MedicineCollectionToolbar({
  query,
  view,
  sort,
  onQueryChange,
  onViewChange,
  onSortChange,
}: Props) {
  const nextView = view === 'cabinet' ? 'list' : 'cabinet';
  const nextSort = sort === 'name' ? 'recent' : 'name';

  return (
    <View style={styles.toolbar}>
      <View style={styles.searchField}>
        <PillyIcon name="search" size={18} color={colors.textSecondary} />
        <TextInput
          accessibilityLabel="Search medicines"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          placeholder="Search medicines"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          value={query}
          onChangeText={onQueryChange}
          style={styles.searchInput}
        />
      </View>
      <View style={styles.controls}>
        <CollectionControl
          icon={nextView === 'cabinet' ? 'grid' : 'list'}
          label={view === 'cabinet' ? 'List' : 'Cabinet'}
          accessibilityLabel={`Show medicines as ${nextView}`}
          onPress={() => onViewChange(nextView)}
        />
        <CollectionControl
          icon="sort"
          label={sort === 'name' ? 'Name' : 'Recent'}
          accessibilityLabel={`Sort medicines by ${sort === 'name' ? 'recently added' : 'name'}`}
          onPress={() => onSortChange(nextSort)}
        />
      </View>
    </View>
  );
}

function CollectionControl({
  icon,
  label,
  accessibilityLabel,
  onPress,
}: {
  icon: 'grid' | 'list' | 'sort';
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.control, pressed && styles.pressed]}
    >
      <PillyIcon name={icon} size={18} color={colors.brandStrong} active={false} />
      <PillyText role="caption" style={styles.controlLabel}>
        {label}
      </PillyText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolbar: { gap: spacing.sm },
  searchField: {
    minHeight: controlHeights.compact,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    minHeight: controlHeights.compact,
    paddingVertical: 0,
    color: colors.textPrimary,
  },
  controls: {
    minHeight: controlHeights.compact,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  control: {
    minHeight: controlHeights.compact,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
  },
  controlLabel: { color: colors.brandStrong, fontWeight: '600' },
  pressed: { backgroundColor: colors.brandSoft },
});
