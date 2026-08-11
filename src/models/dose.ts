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
  scheduledOn: string;
  previousStatus: DoseStatus;
  nextStatus: DoseStatus;
  occurredAt: Date;
};
