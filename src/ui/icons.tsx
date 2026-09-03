import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motionDurations } from '@/ui/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type Motion = 'none' | 'press' | 'horizontal' | 'turn';

const icons = {
  add: { glyph: 'add', motion: 'turn' },
  archive: { glyph: 'archive-outline', motion: 'press' },
  back: { glyph: 'chevron-back', motion: 'horizontal' },
  calendar: { glyph: 'calendar-outline', motion: 'press' },
  calendarWeek: { glyph: 'calendar-clear-outline', motion: 'press' },
  close: { glyph: 'close', motion: 'turn' },
  document: { glyph: 'document-text-outline', motion: 'press' },
  done: { glyph: 'checkmark', motion: 'press' },
  edit: { glyph: 'create-outline', motion: 'press' },
  error: { glyph: 'close-circle-outline', motion: 'press' },
  favorite: { glyph: 'heart-outline', motion: 'press' },
  info: { glyph: 'information-circle-outline', motion: 'press' },
  grid: { glyph: 'grid-outline', motion: 'press' },
  list: { glyph: 'list-outline', motion: 'press' },
  medicine: { glyph: 'medkit-outline', motion: 'press' },
  medicineDose: { glyph: 'medical-outline', motion: 'press' },
  next: { glyph: 'chevron-forward', motion: 'horizontal' },
  pending: { glyph: 'time-outline', motion: 'none' },
  palette: { glyph: 'color-palette-outline', motion: 'press' },
  phone: { glyph: 'phone-portrait-outline', motion: 'press' },
  photo: { glyph: 'image-outline', motion: 'press' },
  private: { glyph: 'shield-checkmark-outline', motion: 'press' },
  print: { glyph: 'print-outline', motion: 'press' },
  profile: { glyph: 'person-circle-outline', motion: 'press' },
  refresh: { glyph: 'refresh', motion: 'turn' },
  reminder: { glyph: 'notifications-outline', motion: 'turn' },
  remove: { glyph: 'remove', motion: 'press' },
  save: { glyph: 'save-outline', motion: 'press' },
  search: { glyph: 'search', motion: 'press' },
  sort: { glyph: 'swap-vertical-outline', motion: 'press' },
  settings: { glyph: 'settings-outline', motion: 'turn' },
  skipped: { glyph: 'remove-circle-outline', motion: 'none' },
  statusEmpty: { glyph: 'ellipse-outline', motion: 'none' },
  success: { glyph: 'checkmark-circle-outline', motion: 'press' },
  taken: { glyph: 'checkmark-circle', motion: 'press' },
  delete: { glyph: 'trash-outline', motion: 'press' },
  time: { glyph: 'time-outline', motion: 'none' },
  undo: { glyph: 'arrow-undo-outline', motion: 'horizontal' },
  unlock: { glyph: 'lock-open-outline', motion: 'press' },
  warning: { glyph: 'alert-circle-outline', motion: 'press' },
  website: { glyph: 'globe-outline', motion: 'press' },
} as const satisfies Record<string, { glyph: IoniconName; motion: Motion }>;

export type PillyIconName = keyof typeof icons;

export const nativeTabIcons = {
  today: {
    sf: { default: 'sun.max', selected: 'sun.max.fill' },
    md: { default: 'today', selected: 'today' },
  },
  week: {
    sf: { default: 'calendar', selected: 'calendar.circle.fill' },
    md: { default: 'calendar_month', selected: 'calendar_month' },
  },
  medicines: {
    sf: { default: 'cross.case', selected: 'cross.case.fill' },
    md: { default: 'medication', selected: 'medication' },
  },
} as const;

type Props = {
  name: PillyIconName;
  size?: number;
  color: string;
  active?: boolean;
};

export function PillyIcon({ name, size = 20, color, active = false }: Props) {
  const progress = useSharedValue(0);
  const definition = icons[name];

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
      duration: active ? motionDurations.pressIn : motionDurations.pressOut,
      reduceMotion: ReduceMotion.System,
    });
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    if (definition.motion === 'horizontal') {
      const direction = name === 'back' ? -1 : 1;
      return { transform: [{ translateX: progress.value * direction * 2 }] };
    }
    if (definition.motion === 'turn') {
      return {
        transform: [{ scale: 1 - progress.value * 0.08 }, { rotate: `${progress.value * 10}deg` }],
      };
    }
    if (definition.motion === 'press') {
      return { transform: [{ scale: 1 - progress.value * 0.1 }] };
    }
    return {};
  });

  return (
    <Animated.View style={[styles.frame, { width: size, height: size }, animatedStyle]}>
      <Ionicons name={definition.glyph} size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
});
