import { act, cleanup, render } from '@testing-library/react-native';
import { useFrame } from '@react-three/fiber/native';

import { MedicationAppearancePreview3D } from '@/ui/components/medication-appearance-preview-3d.ios';

jest.mock('@react-three/fiber/native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Canvas: ({
      children,
      pointerEvents,
      style,
    }: {
      children?: React.ReactNode;
      pointerEvents?: import('react-native').ViewProps['pointerEvents'];
      style?: object;
    }) =>
      React.createElement(
        View,
        { pointerEvents, style, testID: 'three-canvas' },
        React.Children.toArray(children).at(-1),
      ),
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
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('shows a neutral loading state while keeping the Canvas render-only', async () => {
    const screen = await render(
      <MedicationAppearancePreview3D
        active
        shape="oval"
        color="#123456"
        secondaryColor="#654321"
      />,
    );

    expect(screen.getByTestId('three-canvas').props.pointerEvents).toBe('none');
    expect(
      screen.getByTestId('three-preview-loading', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('pill-body', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
    const preview = screen.getByLabelText('Oval pill preview');
    expect(preview.props.accessibilityRole).toBe('image');
    expect(preview.props.accessibilityState).toEqual({ busy: true });
    expect(preview.props.accessibilityActions).toBeUndefined();
  });

  test('uses the same loading state before the modal becomes active', async () => {
    const screen = await render(
      <MedicationAppearancePreview3D
        active={false}
        shape="capsule"
        color="#123456"
        secondaryColor="#654321"
      />,
    );

    expect(
      screen.getByTestId('three-preview-loading', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('pill-body', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByTestId('three-canvas')).not.toBeOnTheScreen();
  });

  test('reveals the Canvas only after its first frame is presented', async () => {
    jest.useFakeTimers();
    jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });
    const screen = await render(
      <MedicationAppearancePreview3D
        active
        shape="round"
        color="#123456"
        secondaryColor="#654321"
      />,
    );
    const firstFrame = jest.mocked(useFrame).mock.calls.at(-1)?.[0];

    await act(() => firstFrame?.({} as never, 0));

    expect(
      screen.getByTestId('three-preview-loading', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Round pill preview').props.accessibilityState).toEqual({
      busy: true,
    });

    await act(() => jest.advanceTimersByTime(250));

    expect(screen.queryByTestId('three-preview-loading')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Round pill preview').props.accessibilityState).toEqual({
      busy: false,
    });
  });

  test('falls back to the native pill when GL does not produce a frame', async () => {
    jest.useFakeTimers();
    const screen = await render(
      <MedicationAppearancePreview3D
        active
        shape="oval"
        color="#123456"
        secondaryColor="#654321"
      />,
    );

    await act(() => jest.advanceTimersByTime(5_000));

    expect(screen.queryByTestId('three-preview-loading')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('three-canvas')).not.toBeOnTheScreen();
    expect(screen.getByTestId('pill-body', { includeHiddenElements: true })).toBeOnTheScreen();
    const fallback = screen.getByLabelText('Oval pill preview');
    expect(fallback.props.accessibilityRole).toBe('image');
  });
});
