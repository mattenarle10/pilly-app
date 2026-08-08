import type { ScheduledDose } from '@/data/repositories';
import type { OrganizerDay } from '@/design/illustrations';
import { toLocalDate } from '@/domain/schedule';

export type TodayOrganizerDay = OrganizerDay & { dateNumber: number };

export function greetingFor(date: Date, firstName?: string | null): string {
  const greeting =
    date.getHours() < 12
      ? 'Good morning'
      : date.getHours() < 18
        ? 'Good afternoon'
        : 'Good evening';
  return firstName?.trim() ? `${greeting}, ${firstName.trim()}` : greeting;
}

export function buildOrganizerDays(
  dates: Date[],
  dosesByDay: ScheduledDose[][] | undefined,
): TodayOrganizerDay[] {
  return dates.map((date, index) => {
    const doses = dosesByDay?.[index] ?? [];
    const state =
      doses.length === 0
        ? 'empty'
        : doses.every((dose) => dose.status === 'taken')
          ? 'taken'
          : doses.some((dose) => dose.status === 'skipped')
            ? 'skipped'
            : 'notRecorded';
    return {
      key: toLocalDate(date),
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
      dateNumber: date.getDate(),
      state,
    };
  });
}
