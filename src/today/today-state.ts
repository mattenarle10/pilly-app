import type { ScheduledDose } from '@/data/repositories';
import type { OrganizerDay } from '@/design/illustrations';
import { formatTime, toLocalDate } from '@/domain/schedule';

export type TodayOrganizerDay = OrganizerDay & { dateNumber: number };
export type TodayDoseGroup = { key: string; time: string; doses: ScheduledDose[] };
export type TodayProgress = {
  recorded: number;
  total: number;
  available: number;
  upcoming: number;
};

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

export function isDoseAvailable(dose: ScheduledDose, now: Date): boolean {
  return dose.scheduledAt.getTime() <= now.getTime();
}

export function todayProgress(doses: ScheduledDose[] | undefined, now: Date): TodayProgress {
  const items = doses ?? [];
  const unrecorded = items.filter((dose) => dose.status === 'notRecorded');
  return {
    recorded: items.filter((dose) => dose.status !== 'notRecorded').length,
    total: items.length,
    available: unrecorded.filter((dose) => isDoseAvailable(dose, now)).length,
    upcoming: unrecorded.filter((dose) => !isDoseAvailable(dose, now)).length,
  };
}

export function todayProgressMessage(progress: TodayProgress): string {
  if (progress.recorded === progress.total) return 'Everything is recorded for today.';
  if (progress.available > 0 && progress.upcoming > 0) {
    return `${doseCount(progress.available)} ready to record · ${doseCount(progress.upcoming)} later today.`;
  }
  if (progress.available > 0) return `${doseCount(progress.available)} ready to record.`;
  return `${doseCount(progress.upcoming)} later today.`;
}

function doseCount(count: number): string {
  return `${count} ${count === 1 ? 'dose' : 'doses'}`;
}
