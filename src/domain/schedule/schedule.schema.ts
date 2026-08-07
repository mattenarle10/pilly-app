import { z } from 'zod';

export const localTimeSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export const scheduleSchema = z.object({
  id: z.uuid(),
  medicationId: z.uuid(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  weekdayMask: z.number().int().min(1).max(127),
  sortOrder: z.number().int().nonnegative(),
  reminderEnabled: z.boolean(),
});

export type LocalTime = z.infer<typeof localTimeSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
