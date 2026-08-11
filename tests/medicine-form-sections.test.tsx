import { cleanup, fireEvent, render } from '@testing-library/react-native';

import { ScheduleStep } from '@/features/medicine-form/medication-form-sections';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View },
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (updater: () => object) => updater(),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

describe('ScheduleStep', () => {
  afterEach(cleanup);

  test('adds the next useful exact time without adding another control cluster', async () => {
    const onSchedulesChange = jest.fn();
    const screen = await render(
      <ScheduleStep
        selectedDays={[1, 2, 3, 4, 5, 6, 7]}
        schedules={[{ time: '09:00', reminderEnabled: false }]}
        onDaysChange={jest.fn()}
        onSchedulesChange={onSchedulesChange}
      />,
    );

    fireEvent.press(screen.getByLabelText('Add another dose time'));

    expect(onSchedulesChange).toHaveBeenCalledWith([
      { time: '09:00', reminderEnabled: false },
      { time: '12:00', reminderEnabled: false },
    ]);
  });

  test('keeps reminder choice on the exact schedule entry', async () => {
    const onSchedulesChange = jest.fn();
    const screen = await render(
      <ScheduleStep
        selectedDays={[1, 2, 3, 4, 5, 6, 7]}
        schedules={[{ time: '09:00', reminderEnabled: false }]}
        onDaysChange={jest.fn()}
        onSchedulesChange={onSchedulesChange}
      />,
    );

    fireEvent.press(screen.getByLabelText('Reminder for Morning dose'));

    expect(onSchedulesChange).toHaveBeenCalledWith([{ time: '09:00', reminderEnabled: true }]);
  });

  test('removes one schedule while keeping at least one time', async () => {
    const onSchedulesChange = jest.fn();
    const screen = await render(
      <ScheduleStep
        selectedDays={[1, 2, 3, 4, 5, 6, 7]}
        schedules={[
          { time: '09:00', reminderEnabled: false },
          { time: '12:00', reminderEnabled: true },
        ]}
        onDaysChange={jest.fn()}
        onSchedulesChange={onSchedulesChange}
      />,
    );

    fireEvent.press(screen.getByLabelText('Remove Midday dose time'));

    expect(onSchedulesChange).toHaveBeenCalledWith([{ time: '09:00', reminderEnabled: false }]);
  });
});
