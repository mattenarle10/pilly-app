import type { ScheduledDose } from '@/data/repositories';
import type { OrganizerDay } from '@/design/illustrations';
import { formatTime, toLocalDate } from '@/domain/schedule';

export type TodayOrganizerDay = OrganizerDay & { dateNumber: number };
export type TodayDoseGroup = { key: string; time: string; doses: ScheduledDose[] };
export type TodayProgress = { recorded: number; total: number };

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

export function groupTodayDoses(doses: ScheduledDose[] | undefined): TodayDoseGroup[] {
  const groups = new Map<string, TodayDoseGroup>();
  for (const dose of doses ?? []) {
    const key = `${dose.schedule.hour}:${dose.schedule.minute}`;
    const group = groups.get(key);
    if (group) {
      group.doses.push(dose);
    } else {
      groups.set(key, {
        key,
        time: formatTime(dose.schedule.hour, dose.schedule.minute),
        doses: [dose],
      });
    }
  }
  return [...groups.values()];
}

export function todayProgress(doses: ScheduledDose[] | undefined): TodayProgress {
  const items = doses ?? [];
  return {
    recorded: items.filter((dose) => dose.status !== 'notRecorded').length,
    total: items.length,
  };
}
