import { z } from 'zod';

export const draftKey = 'new-medication-draft-v1';
export const draftSchema = z.object({
  name: z.string(),
  instructions: z.string(),
  selectedDays: z.array(z.number()),
  time: z.string(),
  supply: z.string(),
  reminderEnabled: z.boolean(),
});
export type MedicationDraft = z.infer<typeof draftSchema>;
export type MedicationDraftField = 'name' | 'selectedDays' | 'time' | 'supply';
export type MedicationFormIssue = { field: MedicationDraftField; step: number; message: string };

export const defaults: MedicationDraft = {
  name: '',
  instructions: '',
  selectedDays: [1, 2, 3, 4, 5, 6, 7],
  time: '09:00',
  supply: '',
  reminderEnabled: false,
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
    field: 'time',
    step: 2,
    parse: (draft: MedicationDraft) =>
      z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid time.')
        .safeParse(draft.time),
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
