import type { ScheduledDose } from '@/models/dose';
import {
  isDoseAvailable,
  todayProgress,
  todayProgressDetail,
  todayProgressHeadline,
} from '@/features/today/today-state';

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
    expect(todayProgressHeadline(progress)).toBe('1 ready now');
    expect(todayProgressDetail(progress)).toBe('1 of 3 done · 1 later');
  });

  test('keeps each progress state concise', () => {
    expect([
      todayProgressHeadline({ recorded: 3, total: 3, available: 0, upcoming: 0 }),
      todayProgressDetail({ recorded: 3, total: 3, available: 0, upcoming: 0 }),
    ]).toEqual(['All done today', '3 doses recorded']);
    expect([
      todayProgressHeadline({ recorded: 1, total: 3, available: 2, upcoming: 0 }),
      todayProgressDetail({ recorded: 1, total: 3, available: 2, upcoming: 0 }),
    ]).toEqual(['2 ready now', '1 of 3 done']);
    expect([
      todayProgressHeadline({ recorded: 1, total: 3, available: 0, upcoming: 2 }),
      todayProgressDetail({ recorded: 1, total: 3, available: 0, upcoming: 2 }),
    ]).toEqual(['2 later today', '1 of 3 done']);
  });
});
