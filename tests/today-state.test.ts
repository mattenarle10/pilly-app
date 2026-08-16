import type { ScheduledDose } from '@/models/dose';
import {
  isDoseAvailable,
  todayProgress,
  todayProgressDetail,
  todayProgressHeadline,
} from '@/models/today';
import { buildScheduledDose } from './support/builders';

const scheduledAt = new Date('2026-08-10T13:00:00.000Z');

function makeDose(
  occurrenceId: string,
  status: ScheduledDose['status'],
  time: Date,
): ScheduledDose {
  return buildScheduledDose({
    occurrenceId,
    scheduledAt: time,
    status,
    medication: { name: 'Evening capsule' },
  });
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
