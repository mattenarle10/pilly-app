import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';

import { colors } from '@/ui/tokens';

const compartments = [
  colors.brandSoft,
  colors.peach,
  colors.lavender,
  colors.brandSoft,
  colors.peach,
  colors.lavender,
  colors.brandSoft,
];

export function StarterOrganizer({ active = false }: { active?: boolean }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reducedMotion ? 0 : withTiming(active ? 1 : 0, { duration: 160 });
  }, [active, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -3 }, { scale: 1 - progress.value * 0.025 }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, animatedStyle]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 150">
        <G stroke={colors.textPrimary} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={18} y={42} width={284} height={92} rx={30} fill="#f7e8ed" strokeWidth={4} />
          <Rect
            x={30}
            y={54}
            width={260}
            height={58}
            rx={19}
            fill={colors.background}
            strokeWidth={2.5}
          />
          {compartments.map((fill, index) => (
            <Rect
              key={`${fill}-${index}`}
              x={42 + index * 34}
              y={65}
              width={27}
              height={36}
              rx={9}
              fill={fill}
              strokeWidth={2.5}
            />
          ))}
          <Circle cx={270} cy={32} r={22} fill={colors.surface} strokeWidth={3} />
          <Line x1={260} y1={32} x2={280} y2={32} strokeWidth={3} />
          <Line x1={270} y1={22} x2={270} y2={42} strokeWidth={3} />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', maxWidth: 330, height: 150, alignSelf: 'center' },
});
