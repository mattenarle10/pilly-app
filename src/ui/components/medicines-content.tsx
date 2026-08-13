import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { Medication } from '@/models/medication';
import { EmptyState } from './empty-state';
import { MedicationAppearance } from './medication-appearance';
import { PillyBanner } from './pilly-banner';
import { PillyCard } from './pilly-card';
import { PillyIconButton } from './pilly-icon-button';
import { PillyText } from './pilly-text';
import { PillyIcon } from '@/ui/icons';
import { StarterOrganizer } from '@/ui/illustrations/starter-organizer';
import { colors, spacing } from '@/ui/tokens';

type MedicinesHeaderProps = {
  onAdd: () => void;
  showAdd?: boolean;
};

type MedicinesContentProps = {
  medicines: Medication[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onAdd: () => void;
  onRetry: () => void;
  onOpenMedicine: (medicineId: string) => void;
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
  isLoading,
  isError,
  onAdd,
  onRetry,
  onOpenMedicine,
}: MedicinesContentProps) {
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

  if (!medicines || medicines.length === 0) {
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

  const active = medicines.filter((medicine) => medicine.archivedAt === null);
  const archived = medicines.filter((medicine) => medicine.archivedAt !== null);

  return (
    <View style={styles.content}>
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

      {active.length > 0 ? (
        <MedicineList medicines={active} onOpenMedicine={onOpenMedicine} />
      ) : (
        <PillyCard tone="lavender" padding="medium" style={styles.noActiveState}>
          <PillyText role="headline">No active medicines</PillyText>
          <PillyText role="caption" muted>
            Archived medicines stay available below.
          </PillyText>
        </PillyCard>
      )}

      {archived.length > 0 ? (
        <View style={styles.archivedSection}>
          <View style={styles.sectionHeading}>
            <PillyText role="headline">Archived</PillyText>
            <PillyText role="caption" muted>
              {archived.length}
            </PillyText>
          </View>
          <MedicineList medicines={archived} onOpenMedicine={onOpenMedicine} archived />
        </View>
      ) : null}
    </View>
  );
}

function MedicineList({
  medicines,
  archived = false,
  onOpenMedicine,
}: {
  medicines: Medication[];
  archived?: boolean;
  onOpenMedicine: (medicineId: string) => void;
}) {
  return (
    <PillyCard padding="none" style={styles.listSurface}>
      {medicines.map((medicine, index) => (
        <View key={medicine.id}>
          {index > 0 ? <View style={styles.separator} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${medicine.name}`}
            onPress={() => onOpenMedicine(medicine.id)}
            style={({ pressed }) => [
              styles.row,
              archived && styles.archivedRow,
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
              <PillyText role="caption" muted>
                {archived
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
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerCopy: { flex: 1, gap: spacing.xs },
  content: { gap: spacing.xl },
  loadingState: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  noActiveState: { gap: spacing.xs },
  archivedSection: { gap: spacing.md },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
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
