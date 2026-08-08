import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/design/tokens';

const sizes = { compact: 52, regular: 64 } as const;

export function TodayCompanion({
  recorded,
  total,
  size = 'regular',
}: {
  recorded: number;
  total: number;
  size?: keyof typeof sizes;
}) {
  const reducedMotion = useReducedMotion();
  const complete = total > 0 && recorded === total;
  const resting = total === 0;
  const progress = useSharedValue(0);

  useEffect(() => {
    const target = complete ? 1 : recorded > 0 ? 0.5 : 0;
    progress.value = reducedMotion
      ? target
      : withTiming(target, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [complete, progress, recorded, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -3 }, { rotate: `${progress.value * 2}deg` }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { width: sizes[size], height: sizes[size] }, animatedStyle]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 72 72">
        <Path
          d="M17 39C10 41 9 48 12 53M55 39C62 41 63 48 60 53"
          fill="none"
          stroke={colors.brand}
          strokeLinecap="round"
          strokeWidth={3}
        />
        <Rect
          x={16}
          y={7}
          width={40}
          height={58}
          rx={20}
          fill={colors.brandSoft}
          stroke={colors.brand}
          strokeWidth={3}
        />
        <Path
          d="M17.5 36H54.5V45C54.5 55.5 47 63.5 36 63.5C25 63.5 17.5 55.5 17.5 45V36Z"
          fill={colors.peachSoft}
        />
        <Line x1={17} y1={36} x2={55} y2={36} stroke={colors.brand} strokeWidth={3} />
        <Circle cx={29} cy={27} r={2.2} fill={colors.textPrimary} />
        <Circle cx={43} cy={27} r={2.2} fill={colors.textPrimary} />
        {resting ? (
          <Path d="M29 47Q36 43 43 47" fill="none" stroke={colors.brand} strokeWidth={2.5} />
        ) : complete ? (
          <Path d="M28 45Q36 53 44 45" fill="none" stroke={colors.brand} strokeWidth={2.5} />
        ) : (
          <Line
            x1={30}
            y1={47}
            x2={42}
            y2={47}
            stroke={colors.brand}
            strokeLinecap="round"
            strokeWidth={2.5}
          />
        )}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { flexShrink: 0 },
});
