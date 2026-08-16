import { Pressable, StyleSheet, View } from 'react-native';

import { MedicationAppearance } from './medication-appearance';
import { PillyCard } from './pilly-card';
import { PillyText } from './pilly-text';
import { StatusLabel } from './status-label';
import { colors, spacing } from '@/ui/tokens';
import type { WeekDoseGroup } from '@/models/week';

export function WeekAgenda({
  groups,
  onOpenMedicine,
}: {
  groups: WeekDoseGroup[];
  onOpenMedicine: (medicineId: string) => void;
}) {
  return (
    <PillyCard padding="none" style={styles.surface}>
      {groups.map((group, groupIndex) => (
        <View key={group.key}>
          {groupIndex > 0 ? <View style={styles.groupSeparator} /> : null}
          <View style={styles.group}>
            <PillyText role="label" style={styles.time}>
              {group.time}
            </PillyText>
            <View>
              {group.doses.map((dose, doseIndex) => (
                <View key={dose.occurrenceId}>
                  {doseIndex > 0 ? <View style={styles.doseSeparator} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${dose.medication.name}`}
                    onPress={() => onOpenMedicine(dose.medication.id)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressedRow]}
                  >
                    <View style={styles.identity}>
                      <MedicationAppearance
                        shape={dose.medication.appearanceShape}
                        size={dose.medication.appearanceSize}
                        color={dose.medication.appearanceColor}
                        secondaryColor={dose.medication.appearanceSecondaryColor}
                        display="mini"
                      />
                      <View style={styles.copy}>
                        <PillyText role="headline" numberOfLines={2}>
                          {dose.medication.name}
                        </PillyText>
                        {dose.medication.instructions ? (
                          <PillyText role="caption" muted numberOfLines={2}>
                            {dose.medication.instructions}
                          </PillyText>
                        ) : null}
                      </View>
                    </View>
                    <StatusLabel status={dose.status} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}
    </PillyCard>
  );
}

const styles = StyleSheet.create({
  surface: { overflow: 'hidden' },
  group: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.xs },
  time: { color: colors.brandStrong, paddingHorizontal: spacing.xs },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  identity: {
    minWidth: 180,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copy: { flex: 1, gap: spacing.xs },
  groupSeparator: { height: 1, backgroundColor: colors.surfaceSubtle },
  doseSeparator: {
    height: 1,
    marginLeft: 42,
    backgroundColor: colors.surfaceSubtle,
  },
  pressedRow: { backgroundColor: colors.surfaceSubtle },
});
