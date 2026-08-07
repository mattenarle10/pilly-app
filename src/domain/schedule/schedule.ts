import type { Schedule } from './schedule.schema';

export const everyDayMask = 127;

export function weekdayMask(days: readonly number[]): number {
  return days.reduce((mask, day) => (day >= 1 && day <= 7 ? mask | (1 << (day - 1)) : mask), 0);
}

export function isScheduledOn(schedule: Pick<Schedule, 'weekdayMask'>, date: Date): boolean {
  const bitIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
  return (schedule.weekdayMask & (1 << bitIndex)) !== 0;
}

export function toLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateForSchedule(schedule: Pick<Schedule, 'hour' | 'minute'>, date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    schedule.hour,
    schedule.minute,
    0,
    0,
  );
}

export function occurrenceId(scheduleId: string, date: Date): string {
  return `${scheduleId}:${toLocalDate(date)}`;
}

export function weekStartingToday(today = new Date()): Date[] {
  return Array.from(
    { length: 7 },
    (_, offset) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset),
  );
}

export function formatTime(hour: number, minute: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, hour, minute),
  );
}
