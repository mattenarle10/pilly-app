import { cleanup, fireEvent, render } from '@testing-library/react-native';

import { PillyNumberPicker } from '@/ui/components/pilly-number-picker';
import { colors, controlHeights } from '@/ui/tokens';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View },
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withSequence: (...values: unknown[]) => values.at(-1),
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});

describe('PillyNumberPicker', () => {
  afterEach(cleanup);

  test('keeps an embedded empty-state action visually quiet and fully tappable', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <PillyNumberPicker
        label="Supply"
        value={null}
        onChange={onChange}
        embedded
        startActionVariant="quiet"
      />,
    );
    const action = screen.getByLabelText('Start tracking Supply');

    expect(action).toHaveStyle({
      minHeight: controlHeights.compact,
      backgroundColor: 'transparent',
    });
    expect(screen.getByText('Track')).toHaveStyle({ color: colors.brand });
    expect(screen.queryByText('7')).not.toBeOnTheScreen();
    expect(screen.queryByText('Off')).not.toBeOnTheScreen();

    fireEvent.press(action);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  test('reveals presets after tracking starts', async () => {
    const screen = await render(
      <PillyNumberPicker label="Supply" value={14} onChange={jest.fn()} />,
    );

    expect(screen.getByText('7')).toBeOnTheScreen();
    expect(screen.getByLabelText('Set Supply to 14')).toBeOnTheScreen();
    expect(screen.getByText('Off')).toBeOnTheScreen();
  });
});
