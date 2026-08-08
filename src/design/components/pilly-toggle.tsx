import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, shadows } from '@/design/tokens';

type Props = { value: boolean; label: string; onValueChange: (value: boolean) => void };
export function PillyToggle({ value, label, onValueChange }: Props) {
  const reducedMotion = useReducedMotion();
  const position = useSharedValue(value ? 20 : 0);
  useEffect(() => {
    position.value = reducedMotion
      ? value
        ? 20
        : 0
      : withTiming(value ? 20 : 0, { duration: 180 });
  }, [position, reducedMotion, value]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={6}
      onPress={() => onValueChange(!value)}
      style={[styles.track, value && styles.trackOn]}
    >
      <Animated.View style={[styles.thumb, thumbStyle]} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  track: {
    width: 54,
    height: 34,
    padding: 4,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: colors.brand },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
});
