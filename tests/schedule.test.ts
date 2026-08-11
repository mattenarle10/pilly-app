import {
  dateForSchedule,
  everyDayMask,
  isScheduledOn,
  occurrenceId,
  schedulesMatch,
  toLocalDate,
  weekdayMask,
} from '@/models/schedule';

describe('schedule', () => {
  test('uses Monday through Sunday bits consistently', () => {
    const mondayOnly = { weekdayMask: weekdayMask([1]) };
    const sundayOnly = { weekdayMask: weekdayMask([7]) };
    expect(isScheduledOn(mondayOnly, new Date(2026, 7, 3))).toBe(true);
    expect(isScheduledOn(mondayOnly, new Date(2026, 7, 2))).toBe(false);
    expect(isScheduledOn(sundayOnly, new Date(2026, 7, 2))).toBe(true);
    expect(weekdayMask([1, 2, 3, 4, 5, 6, 7])).toBe(everyDayMask);
  });

  test('builds stable local occurrence identities', () => {
    const date = new Date(2026, 7, 7, 23, 58);
    expect(toLocalDate(date)).toBe('2026-08-07');
    expect(occurrenceId('schedule-1', date)).toBe('schedule-1:2026-08-07');
  });

  test('keeps scheduled time separate from record time', () => {
    const scheduled = dateForSchedule({ hour: 9, minute: 15 }, new Date(2026, 7, 7, 20, 0));
    expect(scheduled.getHours()).toBe(9);
    expect(scheduled.getMinutes()).toBe(15);
  });

  test('detects whether an edit requires a new schedule version', () => {
    const schedule = {
      hour: 9,
      minute: 0,
      weekdayMask: 127,
      sortOrder: 0,
      reminderEnabled: true,
    };
    expect(schedulesMatch([schedule], [{ ...schedule }])).toBe(true);
    expect(schedulesMatch([schedule], [{ ...schedule, minute: 15 }])).toBe(false);
    expect(schedulesMatch([schedule], [])).toBe(false);
  });
});
