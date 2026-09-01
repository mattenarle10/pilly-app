import { z } from 'zod';

export const medicationImageTransferStateSchema = z.enum([
  'pendingUpload',
  'uploaded',
  'failed',
  'pendingDelete',
]);

export const medicationImageSchema = z.object({
  medicationId: z.string().min(1),
  imageId: z.uuid(),
  cacheKey: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  byteCount: z.number().int().positive().max(1_048_576),
  width: z.number().int().positive().max(1_024),
  height: z.number().int().positive().max(1_024),
  remoteVersion: z.string().min(1).nullable(),
  transferState: medicationImageTransferStateSchema,
  updatedAt: z.iso.datetime(),
  lastError: z.string().min(1).nullable(),
});

export type MedicationImage = z.infer<typeof medicationImageSchema>;
export type MedicationImageTransferState = z.infer<typeof medicationImageTransferStateSchema>;

export const stagedMedicationImageSchema = medicationImageSchema
  .omit({
    medicationId: true,
    remoteVersion: true,
    transferState: true,
    updatedAt: true,
    lastError: true,
  })
  .extend({ cacheKey: z.string().startsWith('staging/') });

export type StagedMedicationImage = z.infer<typeof stagedMedicationImageSchema>;
