import { Pressable, StyleSheet, View } from 'react-native';

import { PillyText } from './pilly-text';
import { PillyIcon, type PillyIconName } from '@/design/icons';
import { colors, radii, spacing } from '@/design/tokens';
import type { OrganizerDayState } from '@/design/illustrations';

type Day = { key: string; label: string; dateNumber: number; state: OrganizerDayState };

const stateIcon = {
  empty: 'statusEmpty',
  scheduled: 'statusEmpty',
  notRecorded: 'pending',
  taken: 'done',
  skipped: 'remove',
} as const satisfies Record<OrganizerDayState, PillyIconName>;

export function WeekStatusStrip({
  days,
  selectedIndex = 0,
  onDayPress,
}: {
  days: Day[];
  selectedIndex?: number;
  onDayPress?: (index: number) => void;
}) {
  return (
    <View accessibilityLabel="Seven-day medicine status" style={styles.strip}>
      {days.map((day, index) => {
        const selected = index === selectedIndex;
        const color =
          day.state === 'taken'
            ? colors.success
            : day.state === 'skipped'
              ? colors.warning
              : selected
                ? colors.brand
                : colors.textSecondary;
        return (
          <Pressable
            key={day.key}
            accessibilityRole="button"
            accessibilityLabel={`${day.label} ${day.dateNumber}, ${day.state}`}
            accessibilityState={{ selected }}
            onPress={() => onDayPress?.(index)}
            style={({ pressed }) => [
              styles.day,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.dateCopy}>
              <PillyText role="caption" muted={!selected} style={styles.weekday}>
                {day.label.slice(0, 1)}
              </PillyText>
              <PillyText role="headline" style={selected ? styles.selectedText : undefined}>
                {day.dateNumber}
              </PillyText>
            </View>
            <View style={styles.statusSlot}>
              <PillyIcon name={stateIcon[day.state]} size={13} color={color} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 2,
    padding: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
  },
  day: {
    flex: 1,
    minWidth: 0,
    minHeight: 74,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  dateCopy: { alignItems: 'center', gap: 1 },
  weekday: { fontWeight: '500' },
  statusSlot: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.brandSoft },
  selectedText: { color: colors.brandStrong },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
