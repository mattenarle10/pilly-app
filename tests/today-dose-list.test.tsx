import { cleanup, fireEvent, render } from '@testing-library/react-native';

import type { ScheduledDose } from '@/models/dose';
import { TodayDoseList } from '@/features/today/today-dose-list';

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

const dose: ScheduledDose = {
  occurrenceId: 'evening:2026-08-10',
  medication: {
    id: 'd7bf17a4-3b0c-4c61-9155-7102fe0769f2',
    name: 'Evening capsule',
    instructions: '',
    supplyCount: 14,
    appearanceShape: 'capsule',
    appearanceSize: 'medium',
    appearanceTone: 'rose',
    appearanceSecondaryTone: 'rose',
    createdAt: '2026-08-09T00:00:00.000Z',
    updatedAt: '2026-08-09T00:00:00.000Z',
    archivedAt: null,
    timeZoneIdentifier: 'Asia/Manila',
  },
  schedule: {
    id: '4cf5bccb-1e47-4093-b91d-428cf5eed57b',
    medicationId: 'd7bf17a4-3b0c-4c61-9155-7102fe0769f2',
    hour: 21,
    minute: 0,
    weekdayMask: 127,
    sortOrder: 0,
    reminderEnabled: false,
  },
  scheduledAt: new Date('2026-08-10T13:00:00.000Z'),
  status: 'notRecorded',
  recordedAt: null,
};

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
