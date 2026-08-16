import type { ScheduledDose } from '@/models/dose';
import { formatTime } from '@/models/schedule';

export type NextDoseWidgetProps = {
  state: 'empty' | 'clear' | 'upcoming' | 'ready';
  title: string;
  detail: string;
};

export type NextDoseWidgetTimelineEntry = {
  date: Date;
  props: NextDoseWidgetProps;
};

export const nextDoseWidgetQueryKey = ['next-dose-widget'] as const;

type NextDoseWidgetInput = {
  medicationCount: number;
  doses: readonly ScheduledDose[];
  now: Date;
};

const maxTimelineEntries = 64;

export function buildNextDoseWidgetTimeline({
  medicationCount,
  doses,
  now,
}: NextDoseWidgetInput): NextDoseWidgetTimelineEntry[] {
  const pending = doses
    .filter((dose) => dose.status === 'notRecorded')
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());
  const futureTimes = [
    ...new Set(
      pending
        .map((dose) => dose.scheduledAt.getTime())
        .filter((timestamp) => timestamp > now.getTime()),
    ),
  ];

  return [now.getTime(), ...futureTimes].slice(0, maxTimelineEntries).map((timestamp) => ({
    date: new Date(timestamp),
    props: widgetPropsAt(new Date(timestamp), medicationCount, pending),
  }));
}

function widgetPropsAt(
  date: Date,
  medicationCount: number,
  pending: readonly ScheduledDose[],
): NextDoseWidgetProps {
  if (medicationCount === 0) {
    return {
      state: 'empty',
      title: 'Add medicine',
      detail: 'Set your first reminder',
    };
  }

  const due = pending.filter((dose) => dose.scheduledAt.getTime() <= date.getTime());
  if (due.length > 0) {
    const latestDueTime = Math.max(...due.map((dose) => dose.scheduledAt.getTime()));
    const latestDue = due.filter((dose) => dose.scheduledAt.getTime() === latestDueTime);
    return {
      state: 'ready',
      title: `${doseCount(latestDue.length)} ready`,
      detail: 'Open to record',
    };
  }

  const next = pending.find((dose) => dose.scheduledAt.getTime() > date.getTime());
  if (!next) {
    return {
      state: 'clear',
      title: 'Nothing due',
      detail: 'Next 7 days',
    };
  }

  const countAtTime = pending.filter(
    (dose) => dose.scheduledAt.getTime() === next.scheduledAt.getTime(),
  ).length;
  return {
    state: 'upcoming',
    title: formatTime(next.schedule.hour, next.schedule.minute),
    detail: `${relativeDay(next.scheduledAt, date)} · ${doseCount(countAtTime)}`,
  };
}

function relativeDay(target: Date, from: Date): string {
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const difference = Math.round((targetDay - fromDay) / 86_400_000);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(target);
}

function doseCount(count: number): string {
  return `${count} ${count === 1 ? 'dose' : 'doses'}`;
}
