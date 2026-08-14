import { z } from 'zod';

import type { Medication } from './medication';
import type { Schedule } from './schedule';

export const doseStatusSchema = z.enum(['notRecorded', 'taken', 'skipped']);
export const doseRecordSchema = z.object({
  occurrenceId: z.string().min(1),
  scheduleId: z.uuid(),
  status: doseStatusSchema,
  scheduledAt: z.iso.datetime(),
  recordedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type DoseStatus = z.infer<typeof doseStatusSchema>;
export type DoseRecord = z.infer<typeof doseRecordSchema>;
export type ScheduledDose = {
  occurrenceId: string;
  medication: Medication;
  schedule: Schedule;
  scheduledAt: Date;
  status: DoseStatus;
  recordedAt: Date | null;
};
export type DoseHistoryEntry = {
  id: string;
  occurrenceId: string;
  scheduledAt: Date;
  previousStatus: DoseStatus;
  nextStatus: DoseStatus;
  occurredAt: Date;
};

export type DoseHistoryOccurrence = {
  occurrenceId: string;
  scheduledAt: Date;
  changes: DoseHistoryEntry[];
};

export function describeDoseHistoryChange(
  entry: Pick<DoseHistoryEntry, 'previousStatus' | 'nextStatus'>,
): string {
  if (entry.nextStatus === 'notRecorded') {
    return entry.previousStatus === 'taken' ? 'Removed Taken record' : 'Removed Skipped record';
  }
  if (entry.previousStatus === 'notRecorded') {
    return entry.nextStatus === 'taken' ? 'Marked Taken' : 'Marked Skipped';
  }
  return entry.nextStatus === 'taken' ? 'Changed Skipped to Taken' : 'Changed Taken to Skipped';
}

export function groupDoseHistory(entries: readonly DoseHistoryEntry[]): DoseHistoryOccurrence[] {
  const groups = new Map<string, DoseHistoryOccurrence>();

  entries.forEach((entry) => {
    const existing = groups.get(entry.occurrenceId);
    if (existing) {
      existing.changes.push(entry);
      return;
    }
    groups.set(entry.occurrenceId, {
      occurrenceId: entry.occurrenceId,
      scheduledAt: entry.scheduledAt,
      changes: [entry],
    });
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      changes: [...group.changes].sort(
        (left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
      ),
    }))
    .sort(
      (left, right) =>
        (right.changes[0]?.occurredAt.getTime() ?? 0) -
        (left.changes[0]?.occurredAt.getTime() ?? 0),
    );
}
