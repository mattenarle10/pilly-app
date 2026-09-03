import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Pattern,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { colors, motionDurations } from '@/ui/tokens';

type OnboardingJourneyProps = {
  stage: 'welcome' | 'setup';
};

const AnimatedGroup = Animated.createAnimatedComponent(G);

export function OnboardingJourney({ stage }: OnboardingJourneyProps) {
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(reducedMotion ? 1 : 0);
  const firstDetail = useSharedValue(reducedMotion ? 1 : 0);
  const secondDetail = useSharedValue(reducedMotion ? 1 : 0);
  const thirdDetail = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      entrance.value = 1;
      firstDetail.value = 1;
      secondDetail.value = 1;
      thirdDetail.value = 1;
      return;
    }

    const easing = Easing.out(Easing.cubic);
    entrance.value = withTiming(1, { duration: motionDurations.illustrationEntrance, easing });
    firstDetail.value = withDelay(70, withTiming(1, { duration: 260, easing }));
    secondDetail.value = withDelay(160, withTiming(1, { duration: 240, easing }));
    thirdDetail.value = withDelay(240, withTiming(1, { duration: 240, easing }));
  }, [entrance, firstDetail, reducedMotion, secondDetail, stage, thirdDetail]);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + entrance.value * 0.45,
    transform: [{ translateY: (1 - entrance.value) * 9 }],
  }));
  const firstProps = useAnimatedProps(() => ({
    opacity: firstDetail.value,
    transform: [{ translateY: (1 - firstDetail.value) * -10 }],
  }));
  const secondProps = useAnimatedProps(() => ({
    opacity: secondDetail.value,
    transform: [{ translateY: (1 - secondDetail.value) * 7 }],
  }));
  const thirdProps = useAnimatedProps(() => ({
    opacity: thirdDetail.value,
    transform: [{ translateX: (1 - thirdDetail.value) * 9 }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, frameStyle]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 360 220">
        <IllustrationDefinitions />
        {stage === 'welcome' ? (
          <WelcomeScene firstProps={firstProps} secondProps={secondProps} thirdProps={thirdProps} />
        ) : (
          <SetupScene firstProps={firstProps} secondProps={secondProps} thirdProps={thirdProps} />
        )}
      </Svg>
    </Animated.View>
  );
}

function IllustrationDefinitions() {
  return (
    <Defs>
      <LinearGradient id="onboardingRose" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#f8dbe3" />
        <Stop offset="1" stopColor="#e8aec0" />
      </LinearGradient>
      <LinearGradient id="onboardingPeach" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#fff2e9" />
        <Stop offset="1" stopColor="#f2c6ad" />
      </LinearGradient>
      <LinearGradient id="onboardingTray" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#ffffff" />
        <Stop offset="1" stopColor="#f4eee9" />
      </LinearGradient>
      <Pattern id="onboardingDots" width="12" height="12" patternUnits="userSpaceOnUse">
        <Circle cx="2" cy="2" r="0.8" fill={colors.brand} opacity={0.16} />
      </Pattern>
    </Defs>
  );
}

type AnimatedGroupProps = ReturnType<typeof useAnimatedProps>;

function WelcomeScene({
  firstProps,
  secondProps,
  thirdProps,
}: {
  firstProps: AnimatedGroupProps;
  secondProps: AnimatedGroupProps;
  thirdProps: AnimatedGroupProps;
}) {
  return (
    <G stroke={colors.brand} strokeLinecap="round" strokeLinejoin="round">
      <AnimatedGroup animatedProps={secondProps}>
        <Rect x={45} y={87} width={286} height={108} rx={34} fill={colors.brand} opacity={0.08} />
        <Rect
          x={40}
          y={81}
          width={286}
          height={108}
          rx={34}
          fill="url(#onboardingTray)"
          strokeWidth={3}
        />
        <Rect
          x={40}
          y={81}
          width={286}
          height={108}
          rx={34}
          fill="url(#onboardingDots)"
          stroke="none"
        />
        <Rect
          x={55}
          y={107}
          width={256}
          height={58}
          rx={19}
          fill={colors.surface}
          strokeWidth={2.5}
        />
        {Array.from({ length: 7 }, (_, index) => (
          <Rect
            key={index}
            x={66 + index * 34}
            y={119}
            width={25}
            height={34}
            rx={9}
            fill={index === 0 ? 'url(#onboardingRose)' : colors.surface}
            strokeWidth={2}
            opacity={index === 0 ? 1 : 0.62}
          />
        ))}
        <Path d="M59 96H307" fill="none" stroke={colors.surface} strokeWidth={2} opacity={0.8} />
      </AnimatedGroup>

      <AnimatedGroup animatedProps={firstProps}>
        <Ellipse
          cx={101}
          cy={86}
          rx={56}
          ry={11}
          fill={colors.brand}
          opacity={0.11}
          stroke="none"
        />
        <Rect
          x={40}
          y={34}
          width={118}
          height={54}
          rx={27}
          fill="url(#onboardingRose)"
          strokeWidth={3}
        />
        <Path
          d="M99 35H131C145 35 157 46 157 61C157 75 145 87 131 87H99Z"
          fill="url(#onboardingPeach)"
          stroke="none"
        />
        <Line x1={99} y1={36} x2={99} y2={86} strokeWidth={2.5} />
        <Path
          d="M56 48C69 40 83 40 91 41"
          fill="none"
          stroke={colors.surface}
          strokeWidth={4}
          opacity={0.72}
        />
        <Path
          d="M112 46C124 40 137 42 145 50"
          fill="none"
          stroke={colors.surface}
          strokeWidth={3}
          opacity={0.62}
        />
        <Rect
          x={40}
          y={34}
          width={118}
          height={54}
          rx={27}
          fill="url(#onboardingDots)"
          stroke="none"
          opacity={0.55}
        />
        <Circle cx={79} cy={61} r={2.4} fill={colors.textPrimary} stroke="none" />
        <Circle cx={119} cy={61} r={2.4} fill={colors.textPrimary} stroke="none" />
        <Path d="M87 71Q99 79 111 71" fill="none" strokeWidth={2.4} />
      </AnimatedGroup>

      <AnimatedGroup animatedProps={thirdProps}>
        <Circle cx={78.5} cy={136} r={8} fill={colors.brand} stroke="none" />
        <Path d="M74.5 136L77.5 139L83 132" fill="none" stroke={colors.surface} strokeWidth={2.2} />
      </AnimatedGroup>
    </G>
  );
}

function SetupScene({
  firstProps,
  secondProps,
  thirdProps,
}: {
  firstProps: AnimatedGroupProps;
  secondProps: AnimatedGroupProps;
  thirdProps: AnimatedGroupProps;
}) {
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <G stroke={colors.brand} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={30} y={33} width={306} height={160} rx={31} fill={colors.brand} opacity={0.08} />
      <Rect
        x={24}
        y={27}
        width={306}
        height={160}
        rx={31}
        fill="url(#onboardingTray)"
        strokeWidth={3}
      />
      <Rect
        x={24}
        y={27}
        width={306}
        height={160}
        rx={31}
        fill="url(#onboardingDots)"
        stroke="none"
      />
      <Path d="M42 104H312" fill="none" strokeWidth={1.8} opacity={0.22} />
      <Path d="M43 42H310" fill="none" stroke={colors.surface} strokeWidth={2.5} opacity={0.8} />

      <AnimatedGroup animatedProps={firstProps}>
        <Rect
          x={44}
          y={54}
          width={76}
          height={34}
          rx={17}
          fill="url(#onboardingRose)"
          strokeWidth={2.5}
        />
        <Path
          d="M82 55H103C112 55 119 62 119 71C119 80 112 87 103 87H82Z"
          fill="url(#onboardingPeach)"
          stroke="none"
        />
        <Line x1={82} y1={56} x2={82} y2={86} strokeWidth={2} />
        <Path
          d="M53 64C61 59 69 59 76 60"
          fill="none"
          stroke={colors.surface}
          strokeWidth={2.7}
          opacity={0.7}
        />
        <SvgText
          x={136}
          y={69}
          fill={colors.textPrimary}
          stroke="none"
          fontSize={14}
          fontWeight="700"
        >
          Your medicine
        </SvgText>
        <SvgText x={136} y={87} fill={colors.textSecondary} stroke="none" fontSize={11}>
          Name from the label
        </SvgText>
      </AnimatedGroup>

      <AnimatedGroup animatedProps={secondProps}>
        {dayLabels.map((label, index) => {
          const x = 46 + index * 29;
          return (
            <G key={`${label}-${index}`}>
              <Circle cx={x + 10} cy={137} r={10} fill={colors.brandSoft} strokeWidth={1.5} />
              <SvgText
                x={x + 10}
                y={140.5}
                fill={colors.brandStrong}
                stroke="none"
                fontSize={9}
                fontWeight="700"
                textAnchor="middle"
              >
                {label}
              </SvgText>
            </G>
          );
        })}
        <SvgText x={46} y={169} fill={colors.textSecondary} stroke="none" fontSize={10.5}>
          Every day
        </SvgText>
      </AnimatedGroup>

      <AnimatedGroup animatedProps={thirdProps}>
        <Rect
          x={252}
          y={119}
          width={60}
          height={38}
          rx={19}
          fill={colors.peachSoft}
          strokeWidth={2}
        />
        <SvgText
          x={282}
          y={142.5}
          fill={colors.brandStrong}
          stroke="none"
          fontSize={12}
          fontWeight="700"
          textAnchor="middle"
        >
          9:00
        </SvgText>
        <SvgText x={267} y={170} fill={colors.textSecondary} stroke="none" fontSize={10.5}>
          Time
        </SvgText>
      </AnimatedGroup>
    </G>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', maxWidth: 390, height: 232, alignSelf: 'center' },
});
