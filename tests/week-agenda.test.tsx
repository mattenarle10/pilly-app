import { cleanup, fireEvent, render } from '@testing-library/react-native';

import type { ScheduledDose } from '@/models/dose';
import { buildDoseTimePacks } from '@/models/dose-time-pack';
import { WeekAgenda } from '@/ui/components/week-agenda';

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
      appearanceColor: '#F3CCD7',
      appearanceSecondaryColor: '#ECEAF7',
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

  test('summarizes dense doses into one read-only time pack', async () => {
    const packs = buildDoseTimePacks(
      [
        dose('first-medicine', 'Morning capsule', 'taken'),
        dose('second-medicine', 'Long companion medicine', 'notRecorded'),
      ],
      new Date(2026, 7, 10, 12, 0),
      false,
    );
    const onOpenPack = jest.fn();
    const screen = await render(<WeekAgenda packs={packs} onOpenPack={onOpenPack} />);

    expect(screen.getAllByText('9:00 AM')).toHaveLength(1);
    expect(screen.queryByText('Morning capsule')).toBeNull();
    expect(screen.queryByText('Long companion medicine')).toBeNull();
    fireEvent.press(screen.getByLabelText(packs[0]!.accessibilityLabel));
    expect(onOpenPack).toHaveBeenCalledWith(packs[0]);
  });
});
