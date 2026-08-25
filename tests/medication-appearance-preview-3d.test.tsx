import { cleanup, fireEvent, render } from '@testing-library/react-native';

import {
  MedicationAppearancePreview3D,
  rotationDeltaFromGesture,
} from '@/ui/components/medication-appearance-preview-3d.ios';

jest.mock('@react-three/fiber/native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Canvas: ({
      pointerEvents,
      style,
    }: {
      pointerEvents?: import('react-native').ViewProps['pointerEvents'];
      style?: object;
    }) => React.createElement(View, { pointerEvents, style, testID: 'three-canvas' }),
    useFrame: jest.fn(),
    useThree: (selector: (state: { invalidate: () => void }) => unknown) =>
      selector({ invalidate: jest.fn() }),
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (updater: () => object) => updater(),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

describe('MedicationAppearancePreview3D', () => {
  afterEach(cleanup);

  test('keeps the Canvas render-only and exposes native rotation actions', async () => {
    const screen = await render(
      <MedicationAppearancePreview3D
        active
        shape="oval"
        color="#123456"
        secondaryColor="#654321"
      />,
    );

    expect(screen.getByTestId('three-canvas').props.pointerEvents).toBe('none');
    const preview = screen.getByLabelText('3D oval preview');
    expect(preview.props.accessibilityRole).toBe('adjustable');
    expect(preview.props.accessibilityActions).toEqual([
      { name: 'increment', label: 'Rotate right' },
      { name: 'decrement', label: 'Rotate left' },
    ]);

    await fireEvent(preview, 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
  });

  test('derives rotation only from horizontal drag distance', () => {
    expect(rotationDeltaFromGesture({ dx: 90, dy: 0 }, 0)).toBeCloseTo(Math.PI / 2);
    expect(rotationDeltaFromGesture({ dx: 90, dy: 600 }, 0)).toBeCloseTo(Math.PI / 2);
    expect(rotationDeltaFromGesture({ dx: 100, dy: -600 }, 90)).toBeCloseTo(Math.PI / 18);
  });
});
