import type { ViewStyle } from 'react-native';

export const shadows: Record<'soft' | 'floating', ViewStyle> = {
  soft: {
    shadowColor: '#4b3440',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  floating: {
    shadowColor: '#4b3440',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 2,
  },
};
