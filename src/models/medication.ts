import { z } from 'zod';
import { scheduleSchema, type Schedule } from '@/models/schedule';

export const medicationAppearanceShapeSchema = z.enum(['round', 'oval', 'capsule']);
export const medicationAppearanceSizeSchema = z.enum(['small', 'medium', 'large']);
export const medicationAppearanceColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, 'Choose a valid pill color.');

export const medicationAppearancePalette = {
  rose: '#F3CCD7',
  peach: '#FBE9DE',
  lavender: '#ECEAF7',
  neutral: '#F3F1EB',
} as const;

export const medicationAppearancePresets = [
  { label: 'Rose', color: medicationAppearancePalette.rose },
  { label: 'Peach', color: medicationAppearancePalette.peach },
  { label: 'Lavender', color: medicationAppearancePalette.lavender },
  { label: 'Neutral', color: medicationAppearancePalette.neutral },
] as const;

export const defaultMedicationAppearanceColor = medicationAppearancePalette.rose;
export const defaultMedicationAppearanceSecondaryColor = medicationAppearancePalette.peach;

export function normalizeMedicationAppearanceColor(value: string): MedicationAppearanceColor {
  return medicationAppearanceColorSchema.parse(value.toUpperCase());
}

export function medicationAppearanceColorName(value: MedicationAppearanceColor): string {
  return medicationAppearancePresets.find((preset) => preset.color === value)?.label ?? 'Custom';
}

export function medicationAppearanceColorFromLegacy(value: unknown): MedicationAppearanceColor {
  if (typeof value === 'string' && medicationAppearanceColorSchema.safeParse(value).success) {
    return normalizeMedicationAppearanceColor(value);
  }
  if (typeof value === 'string' && value in medicationAppearancePalette) {
    return medicationAppearancePalette[value as keyof typeof medicationAppearancePalette];
  }
  return defaultMedicationAppearanceColor;
}

export const medicationSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  instructions: z.string().trim().max(500),
  supplyCount: z.number().nonnegative().nullable(),
  appearanceShape: medicationAppearanceShapeSchema,
  appearanceSize: medicationAppearanceSizeSchema,
  appearanceColor: medicationAppearanceColorSchema,
  appearanceSecondaryColor: medicationAppearanceColorSchema,
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
  appearanceColor: medicationAppearanceColorSchema,
  appearanceSecondaryColor: medicationAppearanceColorSchema,
  schedules: z.array(scheduleSchema.omit({ id: true, medicationId: true })).min(1),
});

export const updateMedicationSchema = createMedicationSchema.pick({
  name: true,
  instructions: true,
  supplyCount: true,
  appearanceShape: true,
  appearanceSize: true,
  appearanceColor: true,
  appearanceSecondaryColor: true,
  schedules: true,
});

export type Medication = z.infer<typeof medicationSchema>;
export type MedicationAppearanceShape = z.infer<typeof medicationAppearanceShapeSchema>;
export type MedicationAppearanceSize = z.infer<typeof medicationAppearanceSizeSchema>;
export type MedicationAppearanceColor = z.infer<typeof medicationAppearanceColorSchema>;
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type MedicationDetail = {
  medication: Medication;
  schedules: Schedule[];
};
