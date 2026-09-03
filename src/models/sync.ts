import { z } from 'zod';
import {
  legacyAppearanceShape,
  medicationFormFromLegacyShape,
  storedMedicationFormFromLegacy,
  storedMedicationFormSchema,
  tabletShapeFromLegacy,
  tabletShapeSchema,
} from '@/models/medication';

const isoDateTime = z.iso.datetime();
const uuid = z.uuid();

export const syncProfileSchema = z.object({
  firstName: z.string().trim().max(40),
  lastName: z.string().trim().max(40),
  updatedAt: isoDateTime,
});

const syncMedicineInputSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1).max(120),
  instructions: z.string().trim().max(500),
  supplyCount: z.number().nonnegative().nullable(),
  form: z.string().trim().min(1).optional(),
  tabletShape: tabletShapeSchema.optional(),
  appearanceShape: z.enum(['round', 'oval', 'capsule']).optional(),
  appearanceSize: z.enum(['small', 'medium', 'large']),
  appearanceColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  appearanceSecondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  archivedAt: isoDateTime.nullable(),
  timeZoneIdentifier: z.string().min(1),
});

export const syncMedicineSchema = syncMedicineInputSchema
  .refine((medicine) => medicine.form !== undefined || medicine.appearanceShape !== undefined, {
    message: 'Medicine form or legacy appearance shape is required.',
  })
  .transform((medicine) => {
    const form =
      medicine.form === undefined
        ? medicationFormFromLegacyShape(medicine.appearanceShape)
        : storedMedicationFormFromLegacy(medicine.form);
    const tabletShape = medicine.tabletShape ?? tabletShapeFromLegacy(medicine.appearanceShape);
    return {
      ...medicine,
      form: storedMedicationFormSchema.parse(form),
      tabletShape,
      appearanceShape: legacyAppearanceShape(form, tabletShape),
    };
  });

export const syncScheduleSchema = z.object({
  id: uuid,
  medicationId: uuid,
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  weekdayMask: z.number().int().min(1).max(127),
  sortOrder: z.number().int().nonnegative(),
  startsOn: z.iso.date(),
  endsOn: z.iso.date().nullable(),
  createdAt: isoDateTime,
});

const doseStatusSchema = z.enum(['notRecorded', 'taken', 'skipped']);

export const syncDoseRecordSchema = z.object({
  occurrenceId: z.string().min(1),
  scheduleId: uuid,
  scheduledAt: isoDateTime,
  status: doseStatusSchema.exclude(['notRecorded']),
  recordedAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const syncDoseEventSchema = z.object({
  id: uuid,
  occurrenceId: z.string().min(1),
  previousStatus: doseStatusSchema,
  nextStatus: doseStatusSchema,
  occurredAt: isoDateTime,
});

export const syncSupplyEventSchema = z.object({
  id: uuid,
  medicineId: uuid,
  doseOccurrenceId: z.string().min(1).nullable(),
  delta: z.number().nullable(),
  resultingCount: z.number().nonnegative().nullable(),
  reason: z.enum(['doseRecorded', 'doseCorrected', 'manualCount']),
  occurredAt: isoDateTime,
});

const mutationBase = z.object({ mutationId: uuid, occurredAt: isoDateTime });
const upsert = <Type extends string, Id extends z.ZodType, Data extends z.ZodType>(
  type: Type,
  entityId: Id,
  data: Data,
) => mutationBase.extend({ type: z.literal(type), entityId, data });
const remove = <Type extends string, Id extends z.ZodType>(type: Type, entityId: Id) =>
  mutationBase.extend({ type: z.literal(type), entityId });

export const syncMutationSchema = z.discriminatedUnion('type', [
  upsert('profile.upsert', z.literal('profile'), syncProfileSchema),
  upsert('medicine.upsert', uuid, syncMedicineSchema),
  remove('medicine.delete', uuid),
  upsert('schedule.upsert', uuid, syncScheduleSchema),
  remove('schedule.delete', uuid),
  upsert('doseRecord.upsert', z.string().min(1), syncDoseRecordSchema),
  remove('doseRecord.delete', z.string().min(1)),
  upsert('doseEvent.append', uuid, syncDoseEventSchema),
  remove('doseEvent.delete', uuid),
  upsert('supplyEvent.append', uuid, syncSupplyEventSchema),
  remove('supplyEvent.delete', uuid),
]);

export const cloudChangeSchema = z.object({
  entityType: z.enum(['profile', 'medicine', 'schedule', 'doseRecord', 'doseEvent', 'supplyEvent']),
  entityId: z.string().min(1),
  revision: z.number().int().positive(),
  schemaVersion: z.literal(1),
  mutationId: uuid,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.nullable(),
  data: z.unknown().nullable(),
});

export const plusEntitlementSchema = z.object({
  isActive: z.boolean(),
  productId: z.string().min(1).nullable(),
  expiresAt: isoDateTime.nullable(),
});

export const bootstrapResponseSchema = z.object({
  serverCursor: z.number().int().nonnegative(),
  hasCloudData: z.boolean(),
  changes: z.array(cloudChangeSchema),
  entitlement: plusEntitlementSchema,
});

export const syncResponseSchema = z.object({
  serverCursor: z.number().int().nonnegative(),
  results: z.array(
    z.object({
      mutationId: uuid,
      status: z.enum(['applied', 'alreadyApplied', 'superseded', 'rejected']),
      errorCode: z.string().min(1).optional(),
    }),
  ),
  changes: z.array(cloudChangeSchema),
  entitlement: plusEntitlementSchema,
});

export type SyncMutation = z.infer<typeof syncMutationSchema>;
export type CloudChange = z.infer<typeof cloudChangeSchema>;
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;

export function parseCloudChangeData(change: CloudChange): unknown | null {
  if (change.deletedAt !== null) {
    if (change.data !== null) throw new Error('Deleted cloud records must not contain data.');
    return null;
  }
  const schemas = {
    profile: syncProfileSchema,
    medicine: syncMedicineSchema,
    schedule: syncScheduleSchema,
    doseRecord: syncDoseRecordSchema,
    doseEvent: syncDoseEventSchema,
    supplyEvent: syncSupplyEventSchema,
  } as const;
  return schemas[change.entityType].parse(change.data);
}
