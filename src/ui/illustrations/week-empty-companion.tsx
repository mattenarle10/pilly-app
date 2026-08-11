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

import { colors } from '@/ui/tokens';

export function WeekEmptyCompanion({ variant = 'starter' }: { variant?: 'starter' | 'quiet' }) {
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(reducedMotion ? 1 : 0);
  const starter = variant === 'starter';

  useEffect(() => {
    entrance.value = reducedMotion
      ? 1
      : withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [entrance, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + entrance.value * 0.45,
    transform: [{ translateY: (1 - entrance.value) * 8 }, { scale: 0.97 + entrance.value * 0.03 }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, animatedStyle]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 145">
        <G stroke={colors.brand} strokeLinecap="round" strokeLinejoin="round">
          <Rect
            x={94}
            y={76}
            width={214}
            height={57}
            rx={21}
            fill={colors.surfaceSubtle}
            strokeWidth={3}
          />
          {Array.from({ length: 7 }, (_, index) => (
            <Rect
              key={index}
              x={106 + index * 28}
              y={92}
              width={19}
              height={26}
              rx={7}
              fill={starter && index === 0 ? colors.brandSoft : colors.surface}
              strokeWidth={2}
              opacity={starter && index === 0 ? 1 : 0.58}
            />
          ))}
          {starter ? (
            <>
              <Line x1={111.5} y1={105} x2={119.5} y2={105} strokeWidth={2} />
              <Line x1={115.5} y1={101} x2={115.5} y2={109} strokeWidth={2} />
              <Path d="M115 65V55M110 60H120" strokeWidth={2.25} />
              <Path d="M132 55L137 50M135 58L141 56" strokeWidth={2.25} opacity={0.58} />
            </>
          ) : null}

          <Path d="M30 62C19 60 15 52 18 43" fill="none" strokeWidth={2.75} />
          {starter ? (
            <>
              <Path d="M84 64C94 59 102 61 106 69" fill="none" strokeWidth={2.75} />
              <Path d="M18 43L15 36M18 43L24 37" fill="none" strokeWidth={2.75} />
            </>
          ) : (
            <Path d="M84 66C93 69 98 75 99 83" fill="none" strokeWidth={2.75} />
          )}
          <Rect
            x={29}
            y={19}
            width={57}
            height={99}
            rx={28.5}
            fill={colors.brandSoft}
            strokeWidth={3}
          />
          <Path
            d="M30.5 69H84.5V89C84.5 105 73.5 116.5 57.5 116.5C41.5 116.5 30.5 105 30.5 89V69Z"
            fill={colors.peachSoft}
            stroke="none"
          />
          <Line x1={30} y1={69} x2={85} y2={69} strokeWidth={3} />
          {starter ? (
            <>
              <Circle cx={48} cy={51} r={2.3} fill={colors.textPrimary} stroke="none" />
              <Circle cx={67} cy={51} r={2.3} fill={colors.textPrimary} stroke="none" />
              <Path d="M47 88Q57.5 97 68 88" fill="none" strokeWidth={2.5} />
            </>
          ) : (
            <>
              <Path d="M44 52H51M64 52H71" fill="none" strokeWidth={2.25} />
              <Path d="M48 91Q57.5 96 67 91" fill="none" strokeWidth={2.25} />
            </>
          )}
          <Path d="M43 120L38 127M72 120L77 127" fill="none" strokeWidth={2.75} />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', maxWidth: 340, height: 154, alignSelf: 'center' },
});
