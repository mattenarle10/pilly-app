import { ZodError } from 'zod';
import { InvalidMedicationDraftError } from './medication-form';

export function friendlySaveError(cause: unknown): string {
  if (cause instanceof InvalidMedicationDraftError) return cause.issue.message;
  if (cause instanceof ZodError) return 'One detail needs attention.';
  return 'Couldn’t save this medicine. Try again.';
}

export const draftMessages = {
  reset: 'Started a fresh setup.',
  unavailable: 'Draft saving is unavailable. You can still finish setup.',
} as const;
