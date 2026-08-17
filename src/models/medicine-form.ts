import { z } from 'zod';
import {
  defaultMedicationAppearanceColor,
  defaultMedicationAppearanceSecondaryColor,
  medicationAppearanceColorFromLegacy,
  medicationAppearanceShapeSchema,
  medicationAppearanceSizeSchema,
  medicationAppearanceColorSchema,
} from '@/models/medication';
import { weekdayMask, type Schedule, type ScheduleConfiguration } from '@/models/schedule';

export const draftKey = 'new-medication-draft-v1';
export const medicationScheduleDraftSchema = z.object({
  time: z.string(),
  reminderEnabled: z.boolean(),
});
const currentDraftSchema = z.object({
  name: z.string(),
  instructions: z.string(),
  selectedDays: z.array(z.number()),
  schedules: z
    .array(medicationScheduleDraftSchema)
    .default([{ time: '09:00', reminderEnabled: true }]),
  supply: z.string(),
  appearanceShape: medicationAppearanceShapeSchema.default('capsule'),
  appearanceSize: medicationAppearanceSizeSchema.default('medium'),
  appearanceColor: medicationAppearanceColorSchema.default(defaultMedicationAppearanceColor),
  appearanceSecondaryColor: medicationAppearanceColorSchema.default(
    defaultMedicationAppearanceSecondaryColor,
  ),
});
export const draftSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const legacy = value as Record<string, unknown>;
  const migrated = {
    ...legacy,
    appearanceColor: medicationAppearanceColorFromLegacy(
      legacy.appearanceColor ?? legacy.appearanceTone,
    ),
    appearanceSecondaryColor: medicationAppearanceColorFromLegacy(
      legacy.appearanceSecondaryColor ?? legacy.appearanceSecondaryTone,
    ),
  };
  if (Array.isArray(legacy.schedules) || typeof legacy.time !== 'string') return migrated;
  return {
    ...migrated,
    schedules: [{ time: legacy.time, reminderEnabled: legacy.reminderEnabled === true }],
  };
}, currentDraftSchema);
export type MedicationDraft = z.infer<typeof draftSchema>;
export type MedicationScheduleDraft = z.infer<typeof medicationScheduleDraftSchema>;
export type MedicationDraftField = 'name' | 'selectedDays' | 'schedules' | 'supply';
export type MedicationFormIssue = { field: MedicationDraftField; step: number; message: string };

export const defaults: MedicationDraft = {
  name: '',
  instructions: '',
  selectedDays: [1, 2, 3, 4, 5, 6, 7],
  schedules: [{ time: '09:00', reminderEnabled: true }],
  supply: '',
  appearanceShape: 'capsule',
  appearanceSize: 'medium',
  appearanceColor: defaultMedicationAppearanceColor,
  appearanceSecondaryColor: defaultMedicationAppearanceSecondaryColor,
};

const rules = [
  {
    field: 'name',
    step: 0,
    parse: (draft: MedicationDraft) =>
      z
        .string()
        .trim()
        .min(1, 'Enter the name from the label.')
        .max(120, 'Use a shorter name.')
        .safeParse(draft.name),
  },
  {
    field: 'selectedDays',
    step: 1,
    parse: (draft: MedicationDraft) =>
      z
        .array(z.number().int().min(1).max(7))
        .min(1, 'Choose at least one day.')
        .safeParse(draft.selectedDays),
  },
  {
    field: 'schedules',
    step: 2,
    parse: (draft: MedicationDraft) =>
      z
        .array(
          z.object({
            time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid time.'),
            reminderEnabled: z.boolean(),
          }),
        )
        .min(1, 'Add at least one dose time.')
        .max(8, 'Use eight dose times or fewer.')
        .superRefine((schedules, context) => {
          const times = schedules.map((schedule) => schedule.time);
          if (new Set(times).size !== times.length) {
            context.addIssue({ code: 'custom', message: 'Use each dose time once.' });
          }
        })
        .safeParse(draft.schedules),
  },
  {
    field: 'supply',
    step: 3,
    parse: (draft: MedicationDraft) =>
      z
        .string()
        .trim()
        .refine(
          (value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0),
          'Enter zero or a positive number.',
        )
        .safeParse(draft.supply),
  },
] as const;

export function validateMedicationStep(
  draft: MedicationDraft,
  step: number,
): MedicationFormIssue | null {
  const rule = rules[step];
  if (!rule) return null;
  const result = rule.parse(draft);
  if (result.success) return null;
  return {
    field: rule.field,
    step: rule.step,
    message: result.error.issues[0]?.message ?? 'Check this field.',
  };
}

export function validateMedicationDraft(draft: MedicationDraft): MedicationFormIssue | null {
  for (const rule of rules) {
    const issue = validateMedicationStep(draft, rule.step);
    if (issue) return issue;
  }
  return null;
}

export class InvalidMedicationDraftError extends Error {
  constructor(readonly issue: MedicationFormIssue) {
    super(issue.message);
    this.name = 'InvalidMedicationDraftError';
  }
}

export function assertMedicationDraft(draft: MedicationDraft): void {
  const issue = validateMedicationDraft(draft);
  if (issue) throw new InvalidMedicationDraftError(issue);
}

export function parseTime(value: string): Date {
  const [hour = 9, minute = 0] = value.split(':').map(Number);
  return new Date(2000, 0, 1, hour, minute);
}

export function supplyValue(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

export function selectedDaysFromMask(mask: number): number[] {
  return Array.from({ length: 7 }, (_, index) => index + 1).filter(
    (day) => (mask & (1 << (day - 1))) !== 0,
  );
}

export function scheduleConfigurationFromDraft(draft: MedicationDraft): ScheduleConfiguration[] {
  return [...draft.schedules]
    .sort((left, right) => left.time.localeCompare(right.time))
    .map((schedule, index) => {
      const time = parseTime(schedule.time);
      return {
        hour: time.getHours(),
        minute: time.getMinutes(),
        weekdayMask: weekdayMask(draft.selectedDays),
        sortOrder: index,
        reminderEnabled: schedule.reminderEnabled,
      };
    });
}

export function scheduleDraftsFromSchedules(
  schedules: readonly Pick<Schedule, 'hour' | 'minute' | 'reminderEnabled'>[],
): MedicationScheduleDraft[] {
  if (schedules.length === 0) return defaults.schedules.map((schedule) => ({ ...schedule }));
  return [...schedules]
    .sort((left, right) => left.hour - right.hour || left.minute - right.minute)
    .map((schedule) => ({
      time: `${schedule.hour}`.padStart(2, '0') + ':' + `${schedule.minute}`.padStart(2, '0'),
      reminderEnabled: schedule.reminderEnabled,
    }));
}

export function medicationDraftsMatch(current: MedicationDraft, next: MedicationDraft): boolean {
  const currentSchedules = scheduleConfigurationFromDraft(current);
  const nextSchedules = scheduleConfigurationFromDraft(next);
  return (
    current.name === next.name &&
    current.instructions === next.instructions &&
    weekdayMask(current.selectedDays) === weekdayMask(next.selectedDays) &&
    currentSchedules.length === nextSchedules.length &&
    currentSchedules.every((schedule, index) => {
      const candidate = nextSchedules[index];
      return (
        candidate !== undefined &&
        schedule.hour === candidate.hour &&
        schedule.minute === candidate.minute &&
        schedule.reminderEnabled === candidate.reminderEnabled
      );
    }) &&
    supplyValue(current.supply) === supplyValue(next.supply) &&
    current.appearanceShape === next.appearanceShape &&
    current.appearanceSize === next.appearanceSize &&
    current.appearanceColor === next.appearanceColor &&
    current.appearanceSecondaryColor === next.appearanceSecondaryColor
  );
}
