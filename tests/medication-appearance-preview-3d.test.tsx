import { cleanup, render } from '@testing-library/react-native';

import { MedicationAppearancePreview3D } from '@/ui/components/medication-appearance-preview-3d.ios';

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

  test('keeps the Canvas render-only and exposes an informational preview', async () => {
    const screen = await render(
      <MedicationAppearancePreview3D
        active
        shape="oval"
        color="#123456"
        secondaryColor="#654321"
      />,
    );

    expect(screen.getByTestId('three-canvas').props.pointerEvents).toBe('none');
    const preview = screen.getByLabelText('Oval pill preview');
    expect(preview.props.accessibilityRole).toBe('image');
    expect(preview.props.accessibilityActions).toBeUndefined();
  });
});
