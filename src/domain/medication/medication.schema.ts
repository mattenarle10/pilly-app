import { z } from 'zod';
import { scheduleSchema } from '@/domain/schedule';

export const medicationSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  instructions: z.string().trim().max(500),
  supplyCount: z.number().nonnegative().nullable(),
  createdAt: z.iso.datetime(),
  timeZoneIdentifier: z.string().min(1),
});

export const createMedicationSchema = z.object({
  name: z.string().trim().min(1, 'Enter the name printed on the label.').max(120),
  instructions: z.string().trim().max(500),
  supplyCount: z.number().nonnegative().nullable(),
  schedules: z.array(scheduleSchema.omit({ id: true, medicationId: true })).min(1),
});

export type Medication = z.infer<typeof medicationSchema>;
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
