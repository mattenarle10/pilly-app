import { cleanup, fireEvent, render } from '@testing-library/react-native';

import type { ScheduledDose } from '@/models/dose';
import { WeekAgenda } from '@/ui/components/week-agenda';
import { groupWeekDoses } from '@/models/week';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

function dose(occurrenceId: string, name: string, status: ScheduledDose['status']): ScheduledDose {
  const scheduledAt = new Date(2026, 7, 10, 9, 0);
  return {
    occurrenceId,
    medication: {
      id: occurrenceId,
      name,
      instructions: 'With breakfast',
      supplyCount: 14,
      appearanceShape: 'capsule',
      appearanceSize: 'medium',
      appearanceTone: 'rose',
      appearanceSecondaryTone: 'lavender',
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
      archivedAt: null,
      timeZoneIdentifier: 'Asia/Manila',
    },
    schedule: {
      id: occurrenceId,
      medicationId: occurrenceId,
      hour: 9,
      minute: 0,
      weekdayMask: 127,
      sortOrder: 0,
      reminderEnabled: false,
    },
    scheduledAt,
    status,
    recordedAt: status === 'notRecorded' ? null : scheduledAt,
  };
}

describe('WeekAgenda', () => {
  afterEach(cleanup);

  test('keeps dense doses in one time group and opens medicine detail', async () => {
    const onOpenMedicine = jest.fn();
    const groups = groupWeekDoses([
      dose('first-medicine', 'Morning capsule', 'taken'),
      dose('second-medicine', 'Long companion medicine', 'notRecorded'),
    ]);
    const screen = await render(<WeekAgenda groups={groups} onOpenMedicine={onOpenMedicine} />);

    expect(screen.getAllByText('9:00 AM')).toHaveLength(1);
    expect(screen.getByText('Morning capsule')).toBeOnTheScreen();
    expect(screen.getByText('Long companion medicine')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Open Long companion medicine'));
    expect(onOpenMedicine).toHaveBeenCalledWith('second-medicine');
  });
});
