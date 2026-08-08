import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { PillyText } from './pilly-text';
import { colors, radii, spacing } from '@/design/tokens';
import type { OrganizerDayState } from '@/design/illustrations';

type Day = { key: string; label: string; state: OrganizerDayState };

const stateIcon = {
  empty: 'ellipse-outline',
  scheduled: 'ellipse-outline',
  notRecorded: 'time-outline',
  taken: 'checkmark',
  skipped: 'remove',
} as const;

export function WeekStatusStrip({
  days,
  selectedIndex = 0,
}: {
  days: Day[];
  selectedIndex?: number;
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
          <View
            key={day.key}
            accessibilityLabel={`${day.label}, ${day.state}`}
            style={[styles.day, selected && styles.selected]}
          >
            <PillyText role="caption" muted={!selected}>
              {day.label.slice(0, 1)}
            </PillyText>
            <Ionicons name={stateIcon[day.state]} size={16} color={color} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: spacing.xs },
  day: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  selected: { backgroundColor: colors.brandSoft },
});
