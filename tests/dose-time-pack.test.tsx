import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { buildDoseTimePacks } from '@/models/dose-time-pack';
import { DoseTimePack } from '@/ui/components/dose-time-pack';
import { DoseTimeSheet } from '@/ui/components/dose-time-sheet';
import { buildScheduledDose } from './support/builders';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const transition = { duration: () => transition, reduceMotion: () => transition };
  return {
    __esModule: true,
    default: { View },
    SlideInDown: transition,
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

describe('DoseTimePack', () => {
  afterEach(cleanup);

  test('summarizes a multi-medicine group as one accessible control', async () => {
    const pack = buildDoseTimePacks(
      [
        buildScheduledDose({ occurrenceId: 'one' }),
        buildScheduledDose({ occurrenceId: 'two', medication: { name: 'Second medicine' } }),
      ],
      new Date(2026, 7, 10, 9, 0),
      true,
    )[0]!;
    const onPress = jest.fn();
    const screen = await render(<DoseTimePack pack={pack} onPress={onPress} />);

    fireEvent.press(screen.getByLabelText(pack.accessibilityLabel));

    expect(screen.getByText('2 due')).toBeOnTheScreen();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('keeps individual actions inside the focused sheet', async () => {
    const first = buildScheduledDose({ occurrenceId: 'one', medication: { name: 'First' } });
    const second = buildScheduledDose({
      occurrenceId: 'two',
      medication: { name: 'Second' },
    });
    const pack = buildDoseTimePacks([first, second], first.scheduledAt, true)[0]!;
    const onRecord = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <DoseTimeSheet
          pack={pack}
          visible
          interactive
          busy={false}
          onRecord={onRecord}
          onCorrect={jest.fn()}
          onOpenMedicine={jest.fn()}
          onClose={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getAllByText('Taken')[0]!);

    expect(screen.getByText('0 of 2 recorded')).toBeOnTheScreen();
    expect(onRecord).toHaveBeenCalledWith(first, 'taken');
  });
});
