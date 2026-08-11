import type { ScheduledDose } from '@/models/dose';
import type { OrganizerDay } from '@/ui/illustrations';
import { formatTime } from '@/models/schedule';
import { buildWeekDays } from '@/features/week/week-state';

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
  return buildWeekDays(dates, dosesByDay, new Date());
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

export function todayProgressHeadline(progress: TodayProgress): string {
  if (progress.recorded === progress.total) return 'All done today';
  if (progress.available > 0) return `${progress.available} ready now`;
  return `${progress.upcoming} later today`;
}

export function todayProgressDetail(progress: TodayProgress): string {
  if (progress.recorded === progress.total) return `${doseCount(progress.total)} recorded`;
  const completed = `${progress.recorded} of ${progress.total} done`;
  return progress.available > 0 && progress.upcoming > 0
    ? `${completed} · ${progress.upcoming} later`
    : completed;
}

function doseCount(count: number): string {
  return `${count} ${count === 1 ? 'dose' : 'doses'}`;
}
