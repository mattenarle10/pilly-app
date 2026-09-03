import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { colors, motionDurations } from '@/ui/tokens';

const compartments = [
  colors.brandSoft,
  colors.peach,
  colors.lavender,
  colors.brandSoft,
  colors.peach,
];

export function PillyPlusCompanion({ compact = false }: { compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    entrance.value = reducedMotion
      ? 1
      : withTiming(1, {
          duration: motionDurations.contentEntrance,
          easing: Easing.out(Easing.cubic),
        });
  }, [entrance, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + entrance.value * 0.4,
    transform: [{ translateY: (1 - entrance.value) * 7 }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, compact && styles.compactFrame, animatedStyle]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 155">
        <G stroke={colors.brand} strokeLinecap="round" strokeLinejoin="round">
          <Rect
            x={98}
            y={76}
            width={208}
            height={62}
            rx={23}
            fill={colors.surfaceSubtle}
            strokeWidth={3}
          />
          {compartments.map((fill, index) => (
            <Rect
              key={`${fill}-${index}`}
              x={113 + index * 36}
              y={93}
              width={25}
              height={30}
              rx={8}
              fill={fill}
              strokeWidth={2}
            />
          ))}
          <Rect
            x={29}
            y={23}
            width={66}
            height={110}
            rx={33}
            fill={colors.brandSoft}
            strokeWidth={3}
          />
          <Path
            d="M30.5 78H93.5V100C93.5 118.5 80.5 131.5 62 131.5C43.5 131.5 30.5 118.5 30.5 100V78Z"
            fill={colors.peachSoft}
            stroke="none"
          />
          <Line x1={30} y1={78} x2={94} y2={78} strokeWidth={3} />
          <Circle cx={51} cy={57} r={2.4} fill={colors.textPrimary} stroke="none" />
          <Circle cx={73} cy={57} r={2.4} fill={colors.textPrimary} stroke="none" />
          <Path d="M49 101Q62 112 75 101" fill="none" strokeWidth={2.7} />
          <Path d="M30 70C17 67 13 57 17 46" fill="none" strokeWidth={2.8} />
          <Path d="M94 70C106 65 115 68 119 77" fill="none" strokeWidth={2.8} />
          <Path d="M47 135L41 143M77 135L83 143" fill="none" strokeWidth={2.8} />
          <Path d="M244 38V61M232.5 49.5H255.5" fill="none" strokeWidth={3.2} />
          <Path d="M269 35L276 28M273 43L283 41" fill="none" strokeWidth={2.6} opacity={0.62} />
          <Path d="M219 30L216 19M225 33L232 25" fill="none" strokeWidth={2.6} opacity={0.48} />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', maxWidth: 264, height: 128, alignSelf: 'center' },
  compactFrame: { maxWidth: 224, height: 108 },
});
