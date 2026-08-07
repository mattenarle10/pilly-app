import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { colors } from '@/design/tokens';

export type OrganizerDayState = 'empty' | 'scheduled' | 'notRecorded' | 'taken' | 'skipped';
export type OrganizerDay = { key: string; label: string; state: OrganizerDayState };
type Props = {
  days: readonly OrganizerDay[];
  selectedIndex?: number;
  presentation?: 'welcome' | 'today' | 'week' | 'supply';
  height?: number;
  onDayPress?: (index: number) => void;
};
const AnimatedG = Animated.createAnimatedComponent(G);
const lidColors = [
  colors.brandSoft,
  colors.peach,
  colors.lavender,
  colors.brandSoft,
  colors.peach,
  colors.lavender,
  colors.brandSoft,
];

function OrganizerLid({
  index,
  selected,
  state,
  onPress,
}: {
  index: number;
  selected: boolean;
  state: OrganizerDayState;
  onPress?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const lift = useSharedValue(selected ? -8 : 0);
  useEffect(() => {
    lift.value = reducedMotion
      ? selected
        ? -8
        : 0
      : withTiming(selected ? -8 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [lift, reducedMotion, selected]);
  const animatedProps = useAnimatedProps(() => ({ transform: [{ translateY: lift.value }] }));
  const x = 70 + index * 53;
  const tokenVisible = state === 'taken' || state === 'notRecorded' || state === 'skipped';
  return (
    <AnimatedG animatedProps={animatedProps} onPress={onPress}>
      <Rect
        x={x}
        y={198}
        width={44}
        height={62}
        rx={13}
        fill={lidColors[index]}
        stroke={colors.textPrimary}
        strokeWidth={3}
      />
      <Path
        d={`M${x + 10} 213H${x + 34}`}
        stroke={colors.textSecondary}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.55}
      />
      {tokenVisible ? (
        <Circle
          cx={x + 22}
          cy={state === 'taken' ? 244 : 233}
          r={6}
          fill={state === 'skipped' ? colors.warning : colors.brandStrong}
        />
      ) : null}
    </AnimatedG>
  );
}

export function WeeklyOrganizer({
  days,
  selectedIndex = 0,
  presentation = 'today',
  height = 150,
  onDayPress,
}: Props) {
  const normalized = Array.from(
    { length: 7 },
    (_, index) => days[index] ?? { key: `${index}`, label: '', state: 'empty' as const },
  );
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: '100%', height }}
    >
      <Svg width="100%" height="100%" viewBox="0 110 512 280">
        <G stroke={colors.textPrimary} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={48} y={164} width={416} height={184} rx={42} fill="#f7e8ed" strokeWidth={6} />
          <Rect
            x={62}
            y={182}
            width={388}
            height={94}
            rx={27}
            fill={colors.background}
            strokeWidth={3}
          />
          {normalized.map((day, index) => (
            <OrganizerLid
              key={day.key}
              index={index}
              selected={index === selectedIndex}
              state={day.state}
              onPress={onDayPress ? () => onDayPress(index) : undefined}
            />
          ))}
          {presentation === 'welcome' ? (
            <>
              <Circle cx={228} cy={309} r={6} fill={colors.textPrimary} stroke="none" />
              <Circle cx={284} cy={309} r={6} fill={colors.textPrimary} stroke="none" />
              <Path d="M241 327C250 334 262 334 271 327" strokeWidth={6} />
              <Path
                d="M462 269C483 262 493 245 489 226M489 226L500 210M489 226L474 216"
                strokeWidth={6}
              />
            </>
          ) : null}
        </G>
      </Svg>
    </View>
  );
}
