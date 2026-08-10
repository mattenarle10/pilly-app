import type { ScheduledDose } from '@/data/repositories';
import { isDoseAvailable, todayProgress, todayProgressMessage } from './today-state';

const scheduledAt = new Date('2026-08-10T13:00:00.000Z');

function makeDose(
  occurrenceId: string,
  status: ScheduledDose['status'],
  time: Date,
): ScheduledDose {
  return {
    occurrenceId,
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
      hour: time.getHours(),
      minute: time.getMinutes(),
      weekdayMask: 127,
      sortOrder: 0,
      reminderEnabled: false,
    },
    scheduledAt: time,
    status,
    recordedAt: status === 'notRecorded' ? null : new Date(time.getTime() + 60_000),
  };
}

describe('Today dose availability', () => {
  test('opens recording at the exact scheduled time', () => {
    const dose = makeDose('evening', 'notRecorded', scheduledAt);

    expect(isDoseAvailable(dose, new Date(scheduledAt.getTime() - 1))).toBe(false);
    expect(isDoseAvailable(dose, scheduledAt)).toBe(true);
  });

  test('separates available doses from doses later today', () => {
    const now = new Date('2026-08-10T08:00:00.000Z');
    const progress = todayProgress(
      [
        makeDose('recorded', 'taken', new Date('2026-08-10T01:00:00.000Z')),
        makeDose('ready', 'notRecorded', new Date('2026-08-10T01:00:00.000Z')),
        makeDose('later', 'notRecorded', scheduledAt),
      ],
      now,
    );

    expect(progress).toEqual({ recorded: 1, total: 3, available: 1, upcoming: 1 });
    expect(todayProgressMessage(progress)).toBe('1 dose ready to record · 1 dose later today.');
  });
});
