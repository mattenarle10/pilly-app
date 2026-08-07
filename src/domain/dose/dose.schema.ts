import { z } from 'zod';

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
