import type { ScheduledDose } from '@/models/dose';
import type { OrganizerDayState } from '@/ui/illustrations';
import { formatTime, toLocalDate } from '@/models/schedule';

export type WeekDaySummary = {
  key: string;
  label: string;
  dateNumber: number;
  state: OrganizerDayState;
  total: number;
  recorded: number;
};

export type WeekDoseGroup = {
  key: string;
  time: string;
  doses: ScheduledDose[];
};

export type WeekProgress = {
  recorded: number;
  total: number;
  upcoming: number;
};

export function buildWeekDays(
  dates: readonly Date[],
  dosesByDay: readonly ScheduledDose[][] | undefined,
  now: Date,
): WeekDaySummary[] {
  return dates.map((date, index) => {
    const doses = dosesByDay?.[index] ?? [];
    return {
      key: toLocalDate(date),
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
      dateNumber: date.getDate(),
      state: dayState(doses, now),
      total: doses.length,
      recorded: doses.filter((dose) => dose.status !== 'notRecorded').length,
    };
  });
}

export function dayState(doses: readonly ScheduledDose[], now: Date): OrganizerDayState {
  if (doses.length === 0) return 'empty';

  const unrecorded = doses.filter((dose) => dose.status === 'notRecorded');
  if (unrecorded.some((dose) => dose.scheduledAt.getTime() <= now.getTime())) {
    return 'notRecorded';
  }
  if (unrecorded.length > 0) return 'scheduled';
  if (doses.some((dose) => dose.status === 'skipped')) return 'skipped';
  return 'taken';
}

export function groupWeekDoses(doses: readonly ScheduledDose[]): WeekDoseGroup[] {
  const groups = new Map<string, WeekDoseGroup>();
  for (const dose of doses) {
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

export function weekProgress(
  dosesByDay: readonly ScheduledDose[][] | undefined,
  now: Date,
): WeekProgress {
  const doses = dosesByDay?.flat() ?? [];
  return {
    recorded: doses.filter((dose) => dose.status !== 'notRecorded').length,
    total: doses.length,
    upcoming: doses.filter(
      (dose) => dose.status === 'notRecorded' && dose.scheduledAt.getTime() > now.getTime(),
    ).length,
  };
}

export function weekProgressMessage(progress: WeekProgress): string {
  if (progress.total === 0) return 'No doses in the next 7 days';
  if (progress.recorded === progress.total) return 'Everything is recorded';
  if (progress.recorded === 0 && progress.upcoming === progress.total) {
    return `${doseCount(progress.total)} scheduled`;
  }
  const recorded = `${progress.recorded} of ${progress.total} recorded`;
  return progress.upcoming > 0 ? `${recorded} · ${progress.upcoming} upcoming` : recorded;
}

export function resolveWeekSelection(dates: readonly Date[], requestedDate?: string): number {
  if (!requestedDate) return 0;
  const index = dates.findIndex((date) => toLocalDate(date) === requestedDate);
  return index >= 0 ? index : 0;
}

function doseCount(count: number): string {
  return `${count} ${count === 1 ? 'dose' : 'doses'}`;
}
