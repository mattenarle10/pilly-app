import { cleanup, fireEvent, render } from '@testing-library/react-native';

import type { ScheduledDose } from '@/models/dose';
import { TodayDoseList } from '@/ui/components/today-dose-list';
import { buildScheduledDose } from './support/builders';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const transition = { duration: () => transition, reduceMotion: () => transition };
  return {
    __esModule: true,
    default: { View },
    FadeIn: transition,
    FadeOut: transition,
    LinearTransition: transition,
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

const dose: ScheduledDose = buildScheduledDose({
  occurrenceId: 'evening:2026-08-10',
  scheduledAt: new Date('2026-08-10T13:00:00.000Z'),
  medication: { name: 'Evening capsule' },
});

const groups = [{ key: '21:0', time: '9:00 PM', doses: [dose] }];

describe('TodayDoseList future actions', () => {
  afterEach(cleanup);

  test('replaces actions with a quiet upcoming state until the scheduled time', async () => {
    const onRecord = jest.fn();
    const props = {
      groups,
      busy: false,
      onRecord,
      onCorrect: jest.fn(),
      onOpenMedicine: jest.fn(),
    };
    const screen = await render(
      <TodayDoseList {...props} now={new Date('2026-08-10T08:10:00.000Z')} />,
    );

    expect(screen.getByText('Later today')).toBeOnTheScreen();
    expect(screen.queryByText(/days left/)).toBeNull();
    expect(screen.queryByText('Taken')).toBeNull();
    expect(screen.queryByLabelText('Skip Evening capsule')).toBeNull();

    await screen.rerender(<TodayDoseList {...props} now={dose.scheduledAt} />);
    fireEvent.press(screen.getByText('Taken'));

    expect(screen.queryByText('Later today')).toBeNull();
    expect(onRecord).toHaveBeenCalledWith(dose, 'taken');
  });

  test('uses a quiet text action to correct a recorded dose', async () => {
    const recordedDose: ScheduledDose = {
      ...dose,
      status: 'taken',
      recordedAt: new Date('2026-08-10T13:01:00.000Z'),
    };
    const onCorrect = jest.fn();
    const screen = await render(
      <TodayDoseList
        groups={[{ ...groups[0]!, doses: [recordedDose] }]}
        now={recordedDose.scheduledAt}
        busy={false}
        onRecord={jest.fn()}
        onCorrect={onCorrect}
        onOpenMedicine={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('Change'));

    expect(screen.queryByText(/days left/)).toBeNull();
    expect(screen.queryByLabelText('Change status for Evening capsule')).toBeOnTheScreen();
    expect(onCorrect).toHaveBeenCalledWith(recordedDose);
  });
});
