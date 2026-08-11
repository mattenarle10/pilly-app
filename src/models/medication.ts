import { z } from 'zod';
import { scheduleSchema, type Schedule } from '@/models/schedule';

export const medicationAppearanceShapeSchema = z.enum(['round', 'oval', 'capsule']);
export const medicationAppearanceSizeSchema = z.enum(['small', 'medium', 'large']);
export const medicationAppearanceToneSchema = z.enum(['rose', 'peach', 'lavender', 'neutral']);

export const medicationSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  instructions: z.string().trim().max(500),
  supplyCount: z.number().nonnegative().nullable(),
  appearanceShape: medicationAppearanceShapeSchema,
  appearanceSize: medicationAppearanceSizeSchema,
  appearanceTone: medicationAppearanceToneSchema,
  appearanceSecondaryTone: medicationAppearanceToneSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  archivedAt: z.iso.datetime().nullable(),
  timeZoneIdentifier: z.string().min(1),
});

export const createMedicationSchema = z.object({
  name: z.string().trim().min(1, 'Enter the name printed on the label.').max(120),
  instructions: z.string().trim().max(500),
  supplyCount: z.number().nonnegative().nullable(),
  appearanceShape: medicationAppearanceShapeSchema,
  appearanceSize: medicationAppearanceSizeSchema,
  appearanceTone: medicationAppearanceToneSchema,
  appearanceSecondaryTone: medicationAppearanceToneSchema,
  schedules: z.array(scheduleSchema.omit({ id: true, medicationId: true })).min(1),
});

export const updateMedicationSchema = createMedicationSchema.pick({
  name: true,
  instructions: true,
  supplyCount: true,
  appearanceShape: true,
  appearanceSize: true,
  appearanceTone: true,
  appearanceSecondaryTone: true,
  schedules: true,
});

export type Medication = z.infer<typeof medicationSchema>;
export type MedicationAppearanceShape = z.infer<typeof medicationAppearanceShapeSchema>;
export type MedicationAppearanceSize = z.infer<typeof medicationAppearanceSizeSchema>;
export type MedicationAppearanceTone = z.infer<typeof medicationAppearanceToneSchema>;
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type MedicationDetail = {
  medication: Medication;
  schedules: Schedule[];
};
