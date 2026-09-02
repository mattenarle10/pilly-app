import { z } from 'zod';
import { scheduleSchema, type Schedule } from '@/models/schedule';

export const medicationAppearanceShapeSchema = z.enum(['round', 'oval', 'capsule']);
export const medicationFormSchema = z.enum([
  'tablet',
  'capsule',
  'liquid',
  'injection',
  'drops',
  'inhaler',
]);
export const storedMedicationFormSchema = medicationFormSchema.or(z.literal('other'));
export const tabletShapeSchema = z.enum(['round', 'oval']);
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

export function storedMedicationFormFromLegacy(value: unknown): StoredMedicationForm {
  const parsed = storedMedicationFormSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  if (value === undefined || value === null) return 'capsule';
  return 'other';
}

export function medicationFormFromLegacyShape(value: unknown): StoredMedicationForm {
  return value === 'round' || value === 'oval' ? 'tablet' : 'capsule';
}

export function tabletShapeFromLegacy(value: unknown): TabletShape {
  return value === 'oval' ? 'oval' : 'round';
}

export function legacyAppearanceShape(
  form: StoredMedicationForm,
  tabletShape: TabletShape,
): MedicationAppearanceShape {
  return form === 'tablet' ? tabletShape : 'capsule';
}

export function medicationFormName(form: StoredMedicationForm): string {
  return form === 'other' ? 'Medicine' : form.charAt(0).toUpperCase() + form.slice(1);
}

export function medicationRecognitionDescription({
  form,
  tabletShape,
  color,
  secondaryColor,
}: {
  form: StoredMedicationForm;
  tabletShape: TabletShape;
  color: MedicationAppearanceColor;
  secondaryColor: MedicationAppearanceColor;
}): string {
  const parts = [medicationFormName(form)];
  if (form === 'tablet') {
    parts.push(tabletShape.charAt(0).toUpperCase() + tabletShape.slice(1));
  }
  const primary = medicationAppearanceColorName(color);
  parts.push(
    form === 'capsule' ? `${primary} + ${medicationAppearanceColorName(secondaryColor)}` : primary,
  );
  return parts.join(' · ');
}

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

const canonicalMedicationSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  instructions: z.string().trim().max(500),
  supplyCount: z.number().nonnegative().nullable(),
  form: storedMedicationFormSchema,
  tabletShape: tabletShapeSchema,
  appearanceSize: medicationAppearanceSizeSchema,
  appearanceColor: medicationAppearanceColorSchema,
  appearanceSecondaryColor: medicationAppearanceColorSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  archivedAt: z.iso.datetime().nullable(),
  timeZoneIdentifier: z.string().min(1),
});

export const medicationSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  const form =
    input.form === undefined
      ? medicationFormFromLegacyShape(input.appearanceShape)
      : storedMedicationFormFromLegacy(input.form);
  return {
    ...input,
    form,
    tabletShape:
      input.tabletShape === 'round' || input.tabletShape === 'oval'
        ? input.tabletShape
        : tabletShapeFromLegacy(input.appearanceShape),
  };
}, canonicalMedicationSchema);

export const createMedicationSchema = z.object({
  name: z.string().trim().min(1, 'Enter the name printed on the label.').max(120),
  instructions: z.string().trim().max(500),
  supplyCount: z.number().nonnegative().nullable(),
  form: storedMedicationFormSchema,
  tabletShape: tabletShapeSchema,
  appearanceSize: medicationAppearanceSizeSchema,
  appearanceColor: medicationAppearanceColorSchema,
  appearanceSecondaryColor: medicationAppearanceColorSchema,
  schedules: z.array(scheduleSchema.omit({ id: true, medicationId: true })).min(1),
});

export const updateMedicationSchema = createMedicationSchema.pick({
  name: true,
  instructions: true,
  supplyCount: true,
  form: true,
  tabletShape: true,
  appearanceSize: true,
  appearanceColor: true,
  appearanceSecondaryColor: true,
  schedules: true,
});

export type Medication = z.infer<typeof medicationSchema>;
export type MedicationForm = z.infer<typeof medicationFormSchema>;
export type StoredMedicationForm = z.infer<typeof storedMedicationFormSchema>;
export type TabletShape = z.infer<typeof tabletShapeSchema>;
export type MedicationAppearanceShape = z.infer<typeof medicationAppearanceShapeSchema>;
export type MedicationAppearanceSize = z.infer<typeof medicationAppearanceSizeSchema>;
export type MedicationAppearanceColor = z.infer<typeof medicationAppearanceColorSchema>;
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type MedicationDetail = {
  medication: Medication;
  schedules: Schedule[];
};
