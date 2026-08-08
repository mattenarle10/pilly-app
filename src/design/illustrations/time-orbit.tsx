import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { colors } from '@/design/tokens';

function point(angle: number, radius: number) {
  const radians = (angle - 90) * (Math.PI / 180);
  return { x: 24 + Math.cos(radians) * radius, y: 24 + Math.sin(radians) * radius };
}

export function TimeOrbit({ hour, minute }: { hour: number; minute: number }) {
  const minutePoint = point(minute * 6, 13);
  const hourPoint = point(((hour % 12) + minute / 60) * 30, 9);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 48, height: 48 }}
    >
      <Svg width={48} height={48} viewBox="0 0 48 48">
        <Circle cx={24} cy={24} r={22} fill={colors.lavenderSoft} />
        <Circle cx={24} cy={24} r={16} fill="none" stroke={colors.brandSoft} strokeWidth={2} />
        <Line
          x1={24}
          y1={24}
          x2={hourPoint.x}
          y2={hourPoint.y}
          stroke={colors.brandStrong}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Line
          x1={24}
          y1={24}
          x2={minutePoint.x}
          y2={minutePoint.y}
          stroke={colors.brand}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx={24} cy={24} r={2.5} fill={colors.brandStrong} />
      </Svg>
    </View>
  );
}
