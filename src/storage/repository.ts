import { and, asc, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import {
  cloudState,
  doseEvents,
  doseRecords,
  medicationImages,
  medications,
  schedules,
  settings,
  syncOutbox,
  supplyEvents,
} from './database-schema';
import {
  createMedicationSchema,
  medicationSchema,
  updateMedicationSchema,
  type CreateMedicationInput,
  type Medication,
  type MedicationDetail,
  type UpdateMedicationInput,
} from '@/models/medication';
import {
  dateForSchedule,
  isScheduledOn,
  occurrenceId,
  schedulesMatch,
  scheduleSchema,
  toLocalDate,
} from '@/models/schedule';
import type { DoseHistoryEntry, DoseStatus, ScheduledDose } from '@/models/dose';
import type {
  ExportDoseEvent,
  ExportDoseRecord,
  ExportSchedule,
  ExportSupplyEvent,
} from '@/models/export';
import { supplyAdjustment } from '@/models/supply';
import { profileDisplayName, profileSettingKeys } from '@/models/profile';
import { syncMutationSchema, type SyncMutation } from '@/models/sync';
import {
  medicationImageSchema,
  type MedicationImage,
  type MedicationImageTransferState,
} from '@/models/medication-image';

export type CreatedMedication = {
  medicationId: string;
  schedules: {
    id: string;
    hour: number;
    minute: number;
    weekdayMask: number;
    reminderEnabled: boolean;
  }[];
};

export type ReminderSchedule = CreatedMedication['schedules'][number];

const settingValueSchema = z.string();

type PillyDatabase = ReturnType<typeof drizzle>;
type PillyTransaction = Parameters<Parameters<PillyDatabase['transaction']>[0]>[0];

export class PillyRepository {
  private readonly db;

  constructor(database: SQLiteDatabase) {
    this.db = drizzle(database);
  }

  private activeSyncAccountId(): string | null {
    const state = this.db.select().from(cloudState).where(eq(cloudState.id, 'current')).get();
    return state?.migrationState === 'active' ? state.accountId : null;
  }

  private transactionWithSync(run: (transaction: PillyTransaction) => SyncMutation[]): void {
    const accountId = this.activeSyncAccountId();
    this.db.transaction((transaction) => {
      const mutations = run(transaction);
      if (!accountId || mutations.length === 0) return;
      transaction
        .insert(syncOutbox)
        .values(
          mutations.map((mutation, index) => ({
            mutationId: mutation.mutationId,
            accountId,
            type: mutation.type,
            entityId: mutation.entityId,
            occurredAt: mutation.occurredAt,
            payload: 'data' in mutation ? JSON.stringify(mutation.data) : null,
            attemptCount: 0,
            lastError: null,
            createdAt: `${mutation.occurredAt}:${index.toString().padStart(4, '0')}`,
          })),
        )
        .run();
    });
  }

  async createMedication(input: CreateMedicationInput): Promise<CreatedMedication> {
    const validated = createMedicationSchema.parse(input);
    const medicationId = Crypto.randomUUID();
    const now = new Date().toISOString();
    const startsOn = toLocalDate(new Date());
    const timeZoneIdentifier = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';

    const createdSchedules = validated.schedules.map((schedule) => ({
      ...schedule,
      id: Crypto.randomUUID(),
    }));
    const medicine = {
      id: medicationId,
      name: validated.name,
      instructions: validated.instructions,
      supplyCount: validated.supplyCount,
      appearanceShape: validated.appearanceShape,
      appearanceSize: validated.appearanceSize,
      appearanceColor: validated.appearanceColor,
      appearanceSecondaryColor: validated.appearanceSecondaryColor,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      timeZoneIdentifier,
    };
    this.transactionWithSync((transaction) => {
      transaction.insert(medications).values(medicine).run();
      const scheduleMutations: SyncMutation[] = [];
      createdSchedules.forEach((schedule, index) => {
        const scheduleData = {
          id: schedule.id,
          medicationId,
          hour: schedule.hour,
          minute: schedule.minute,
          weekdayMask: schedule.weekdayMask,
          sortOrder: index,
          startsOn,
          endsOn: null,
          createdAt: now,
        };
        transaction
          .insert(schedules)
          .values({
            ...scheduleData,
            reminderEnabled: schedule.reminderEnabled,
          })
          .run();
        scheduleMutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'schedule.upsert',
            entityId: schedule.id,
            occurredAt: now,
            data: scheduleData,
          }),
        );
      });
      return [
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'medicine.upsert',
          entityId: medicationId,
          occurredAt: now,
          data: medicine,
        }),
        ...scheduleMutations,
      ];
    });
    return { medicationId, schedules: createdSchedules };
  }

  async listMedications(options: { includeArchived?: boolean } = {}): Promise<Medication[]> {
    const rows = options.includeArchived
      ? this.db.select().from(medications).orderBy(asc(medications.createdAt)).all()
      : this.db
          .select()
          .from(medications)
          .where(isNull(medications.archivedAt))
          .orderBy(asc(medications.createdAt))
          .all();
    return rows.map((row) => medicationSchema.parse(row));
  }

  async getMedication(id: string): Promise<MedicationDetail | null> {
    const medication = this.db.select().from(medications).where(eq(medications.id, id)).get();
    if (!medication) return null;
    const medicationSchedules = this.db
      .select()
      .from(schedules)
      .where(eq(schedules.medicationId, id))
      .orderBy(asc(schedules.sortOrder))
      .all()
      .filter((schedule) => schedule.endsOn === null);
    return {
      medication: medicationSchema.parse(medication),
      schedules: medicationSchedules.map((schedule) => scheduleSchema.parse(schedule)),
    };
  }

  async getMedicationImage(medicationId: string): Promise<MedicationImage | null> {
    const row = this.db
      .select()
      .from(medicationImages)
      .where(eq(medicationImages.medicationId, medicationId))
      .get();
    return row ? medicationImageSchema.parse(row) : null;
  }

  async saveMedicationImage(image: MedicationImage): Promise<void> {
    const validated = medicationImageSchema.parse(image);
    this.db
      .insert(medicationImages)
      .values(validated)
      .onConflictDoUpdate({
        target: medicationImages.medicationId,
        set: {
          imageId: validated.imageId,
          cacheKey: validated.cacheKey,
          sha256: validated.sha256,
          byteCount: validated.byteCount,
          width: validated.width,
          height: validated.height,
          remoteVersion: validated.remoteVersion,
          transferState: validated.transferState,
          updatedAt: validated.updatedAt,
          lastError: validated.lastError,
        },
      })
      .run();
  }

  async updateMedicationImageTransfer(input: {
    medicationId: string;
    state: MedicationImageTransferState;
    remoteVersion?: string | null;
    lastError?: string | null;
  }): Promise<void> {
    this.db
      .update(medicationImages)
      .set({
        transferState: input.state,
        remoteVersion: input.remoteVersion,
        lastError: input.lastError ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(medicationImages.medicationId, input.medicationId))
      .run();
  }

  async removeMedicationImage(medicationId: string): Promise<MedicationImage | null> {
    const image = await this.getMedicationImage(medicationId);
    if (!image) return null;
    this.db.delete(medicationImages).where(eq(medicationImages.medicationId, medicationId)).run();
    return image;
  }

  async listMedicationImages(): Promise<MedicationImage[]> {
    return this.db
      .select()
      .from(medicationImages)
      .all()
      .map((row) => medicationImageSchema.parse(row));
  }

  async updateMedication(
    medicationId: string,
    input: UpdateMedicationInput,
  ): Promise<CreatedMedication> {
    const validated = updateMedicationSchema.parse(input);
    const medication = this.db
      .select()
      .from(medications)
      .where(eq(medications.id, medicationId))
      .get();
    if (!medication) throw new Error('Medicine not found.');
    const currentSchedules = this.db
      .select()
      .from(schedules)
      .where(and(eq(schedules.medicationId, medicationId), isNull(schedules.endsOn)))
      .orderBy(asc(schedules.sortOrder))
      .all();
    const scheduleChanged = !schedulesMatch(currentSchedules, validated.schedules);
    const now = new Date();
    const effectiveDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startsOn = toLocalDate(effectiveDate);
    const endsOn = toLocalDate(now);
    const createdAt = now.toISOString();
    const savedSchedules = scheduleChanged
      ? validated.schedules.map((schedule) => ({ ...schedule, id: Crypto.randomUUID() }))
      : currentSchedules.map((schedule) => ({
          id: schedule.id,
          hour: schedule.hour,
          minute: schedule.minute,
          weekdayMask: schedule.weekdayMask,
          sortOrder: schedule.sortOrder,
          reminderEnabled: schedule.reminderEnabled,
        }));
    const supplyChanged = medication.supplyCount !== validated.supplyCount;
    const supplyDelta =
      medication.supplyCount === null || validated.supplyCount === null
        ? null
        : validated.supplyCount - medication.supplyCount;
    const updatedMedicine = {
      ...medication,
      name: validated.name,
      instructions: validated.instructions,
      supplyCount: validated.supplyCount,
      appearanceShape: validated.appearanceShape,
      appearanceSize: validated.appearanceSize,
      appearanceColor: validated.appearanceColor,
      appearanceSecondaryColor: validated.appearanceSecondaryColor,
      updatedAt: createdAt,
    };
    const supplyEventId = supplyChanged ? Crypto.randomUUID() : null;

    this.transactionWithSync((transaction) => {
      transaction
        .update(medications)
        .set({
          name: updatedMedicine.name,
          instructions: updatedMedicine.instructions,
          supplyCount: updatedMedicine.supplyCount,
          appearanceShape: updatedMedicine.appearanceShape,
          appearanceSize: updatedMedicine.appearanceSize,
          appearanceColor: updatedMedicine.appearanceColor,
          appearanceSecondaryColor: updatedMedicine.appearanceSecondaryColor,
          updatedAt: createdAt,
        })
        .where(eq(medications.id, medicationId))
        .run();
      const mutations: SyncMutation[] = [
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'medicine.upsert',
          entityId: medicationId,
          occurredAt: createdAt,
          data: updatedMedicine,
        }),
      ];
      if (supplyChanged && supplyEventId) {
        const supplyEvent = {
          id: supplyEventId,
          medicineId: medicationId,
          doseOccurrenceId: null,
          delta: supplyDelta,
          resultingCount: validated.supplyCount,
          reason: 'manualCount' as const,
          occurredAt: createdAt,
        };
        transaction
          .insert(supplyEvents)
          .values({
            id: supplyEventId,
            medicationId,
            doseOccurrenceId: null,
            delta: supplyDelta,
            resultingCount: validated.supplyCount,
            reason: 'manualCount',
            occurredAt: createdAt,
          })
          .run();
        mutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'supplyEvent.append',
            entityId: supplyEventId,
            occurredAt: createdAt,
            data: supplyEvent,
          }),
        );
      }
      if (scheduleChanged) {
        transaction
          .update(schedules)
          .set({ endsOn })
          .where(and(eq(schedules.medicationId, medicationId), isNull(schedules.endsOn)))
          .run();
        currentSchedules.forEach((schedule) => {
          const { reminderEnabled: _reminderEnabled, ...scheduleData } = schedule;
          mutations.push(
            syncMutationSchema.parse({
              mutationId: Crypto.randomUUID(),
              type: 'schedule.upsert',
              entityId: schedule.id,
              occurredAt: createdAt,
              data: { ...scheduleData, endsOn },
            }),
          );
        });
        savedSchedules.forEach((schedule, index) => {
          const scheduleData = {
            id: schedule.id,
            medicationId,
            hour: schedule.hour,
            minute: schedule.minute,
            weekdayMask: schedule.weekdayMask,
            sortOrder: index,
            startsOn,
            endsOn: null,
            createdAt,
          };
          transaction
            .insert(schedules)
            .values({
              ...scheduleData,
              reminderEnabled: schedule.reminderEnabled,
            })
            .run();
          mutations.push(
            syncMutationSchema.parse({
              mutationId: Crypto.randomUUID(),
              type: 'schedule.upsert',
              entityId: schedule.id,
              occurredAt: createdAt,
              data: scheduleData,
            }),
          );
        });
      }
      return mutations;
    });
    return { medicationId, schedules: savedSchedules };
  }

  async listReminderSchedules(): Promise<ReminderSchedule[]> {
    return this.db
      .select({ schedule: schedules })
      .from(schedules)
      .innerJoin(medications, eq(schedules.medicationId, medications.id))
      .where(and(isNull(medications.archivedAt), isNull(schedules.endsOn)))
      .orderBy(asc(schedules.sortOrder))
      .all()
      .map(({ schedule }) => ({
        id: schedule.id,
        hour: schedule.hour,
        minute: schedule.minute,
        weekdayMask: schedule.weekdayMask,
        reminderEnabled: schedule.reminderEnabled,
      }));
  }

  async listDoseHistory(medicationId: string): Promise<DoseHistoryEntry[]> {
    const medicationSchedules = this.db
      .select()
      .from(schedules)
      .where(eq(schedules.medicationId, medicationId))
      .all();
    const schedulesById = new Map(
      medicationSchedules.map((schedule) => [schedule.id, schedule] as const),
    );
    if (medicationSchedules.length === 0) return [];
    return this.db
      .select()
      .from(doseEvents)
      .where(
        or(
          ...medicationSchedules.map((schedule) =>
            like(doseEvents.occurrenceId, `${schedule.id}:%`),
          ),
        ),
      )
      .orderBy(desc(doseEvents.occurredAt))
      .all()
      .flatMap((event) => {
        const [scheduleId, scheduledOn] = event.occurrenceId.split(':');
        const schedule = schedulesById.get(scheduleId ?? '');
        const dateParts = scheduledOn?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!schedule || !dateParts) return [];
        const [, year, month, day] = dateParts;
        return [
          {
            id: event.id,
            occurrenceId: event.occurrenceId,
            scheduledAt: new Date(
              Number(year),
              Number(month) - 1,
              Number(day),
              schedule.hour,
              schedule.minute,
            ),
            previousStatus: event.previousStatus,
            nextStatus: event.nextStatus,
            occurredAt: new Date(event.occurredAt),
          },
        ];
      });
  }

  async listExportDoseRecords(): Promise<ExportDoseRecord[]> {
    return this.db
      .select({ record: doseRecords, schedule: schedules, medication: medications })
      .from(doseRecords)
      .innerJoin(schedules, eq(doseRecords.scheduleId, schedules.id))
      .innerJoin(medications, eq(schedules.medicationId, medications.id))
      .orderBy(desc(doseRecords.scheduledAt))
      .all()
      .map(({ record, medication }) => ({
        occurrenceId: record.occurrenceId,
        scheduleId: record.scheduleId,
        medicineId: medication.id,
        medicineName: medication.name,
        scheduledAt: record.scheduledAt,
        status: record.status,
        recordedAt: record.recordedAt,
        updatedAt: record.updatedAt,
      }));
  }

  async listExportSchedules(): Promise<ExportSchedule[]> {
    return this.db
      .select()
      .from(schedules)
      .orderBy(asc(schedules.createdAt), asc(schedules.sortOrder))
      .all()
      .map((schedule) => ({
        ...scheduleSchema.parse(schedule),
        startsOn: schedule.startsOn,
        endsOn: schedule.endsOn,
        createdAt: schedule.createdAt,
      }));
  }

  async listExportDoseEvents(): Promise<ExportDoseEvent[]> {
    return this.db.select().from(doseEvents).orderBy(asc(doseEvents.occurredAt)).all();
  }

  async listExportSupplyEvents(): Promise<ExportSupplyEvent[]> {
    return this.db
      .select()
      .from(supplyEvents)
      .orderBy(asc(supplyEvents.occurredAt))
      .all()
      .map(({ medicationId, ...event }) => ({ ...event, medicineId: medicationId }));
  }

  async listScheduledDoses(date: Date): Promise<ScheduledDose[]> {
    return (await this.listScheduledDosesForDates([date]))[0] ?? [];
  }

  async listScheduledDosesForDates(dates: readonly Date[]): Promise<ScheduledDose[][]> {
    if (dates.length === 0) return [];
    const joined = this.db
      .select({ medication: medications, schedule: schedules })
      .from(schedules)
      .innerJoin(medications, eq(schedules.medicationId, medications.id))
      .where(isNull(medications.archivedAt))
      .orderBy(asc(schedules.hour), asc(schedules.minute), asc(schedules.sortOrder))
      .all();
    const activeByDate = dates.map((date) => {
      const localDate = toLocalDate(date);
      return joined.filter(
        ({ schedule }) =>
          schedule.startsOn <= localDate &&
          (schedule.endsOn === null || schedule.endsOn >= localDate) &&
          isScheduledOn(scheduleSchema.parse(schedule), date),
      );
    });
    const ids = activeByDate.flatMap((active, index) =>
      active.map(({ schedule }) => occurrenceId(schedule.id, dates[index]!)),
    );
    const records =
      ids.length === 0
        ? []
        : this.db.select().from(doseRecords).where(inArray(doseRecords.occurrenceId, ids)).all();
    const byId = new Map(records.map((record) => [record.occurrenceId, record]));

    return activeByDate.map((active, index) => {
      const date = dates[index]!;
      return active.map(({ medication, schedule }) => {
        const parsedSchedule = scheduleSchema.parse(schedule);
        const id = occurrenceId(parsedSchedule.id, date);
        const record = byId.get(id);
        return {
          occurrenceId: id,
          medication: medicationSchema.parse(medication),
          schedule: parsedSchedule,
          scheduledAt: dateForSchedule(parsedSchedule, date),
          status: record?.status ?? 'notRecorded',
          recordedAt: record ? new Date(record.recordedAt) : null,
        };
      });
    });
  }

  async recordDose(
    dose: ScheduledDose,
    nextStatus: Exclude<DoseStatus, 'notRecorded'>,
  ): Promise<void> {
    const now = new Date().toISOString();
    this.transactionWithSync((transaction) => {
      const current = transaction
        .select()
        .from(doseRecords)
        .where(eq(doseRecords.occurrenceId, dose.occurrenceId))
        .get();
      const delta = supplyAdjustment(current?.status ?? 'notRecorded', nextStatus);
      const doseEvent = {
        id: Crypto.randomUUID(),
        occurrenceId: dose.occurrenceId,
        previousStatus: current?.status ?? ('notRecorded' as const),
        nextStatus,
        occurredAt: now,
      };
      transaction.insert(doseEvents).values(doseEvent).run();
      const mutations: SyncMutation[] = [
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'doseEvent.append',
          entityId: doseEvent.id,
          occurredAt: now,
          data: doseEvent,
        }),
      ];
      if (delta !== 0) {
        transaction
          .update(medications)
          .set({
            supplyCount: sql`CASE WHEN ${medications.supplyCount} IS NULL THEN NULL ELSE MAX(0, ${medications.supplyCount} + ${delta}) END`,
          })
          .where(eq(medications.id, dose.medication.id))
          .run();
        const updatedMedicine = transaction
          .select()
          .from(medications)
          .where(eq(medications.id, dose.medication.id))
          .get();
        if (!updatedMedicine) throw new Error('Medicine not found.');
        const supplyEvent = {
          id: Crypto.randomUUID(),
          medicineId: dose.medication.id,
          doseOccurrenceId: dose.occurrenceId,
          delta,
          resultingCount: updatedMedicine.supplyCount,
          reason: 'doseRecorded' as const,
          occurredAt: now,
        };
        transaction
          .insert(supplyEvents)
          .values({
            id: supplyEvent.id,
            medicationId: dose.medication.id,
            doseOccurrenceId: dose.occurrenceId,
            delta,
            resultingCount: supplyEvent.resultingCount,
            reason: 'doseRecorded',
            occurredAt: now,
          })
          .run();
        mutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'medicine.upsert',
            entityId: updatedMedicine.id,
            occurredAt: now,
            data: updatedMedicine,
          }),
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'supplyEvent.append',
            entityId: supplyEvent.id,
            occurredAt: now,
            data: supplyEvent,
          }),
        );
      }
      const doseRecord = {
        occurrenceId: dose.occurrenceId,
        scheduleId: dose.schedule.id,
        status: nextStatus,
        scheduledAt: dose.scheduledAt.toISOString(),
        recordedAt: now,
        updatedAt: now,
      };
      transaction
        .insert(doseRecords)
        .values(doseRecord)
        .onConflictDoUpdate({
          target: doseRecords.occurrenceId,
          set: { status: nextStatus, recordedAt: now, updatedAt: now },
        })
        .run();
      mutations.push(
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'doseRecord.upsert',
          entityId: dose.occurrenceId,
          occurredAt: now,
          data: doseRecord,
        }),
      );
      return mutations;
    });
  }

  async undoDose(dose: ScheduledDose): Promise<void> {
    const now = new Date().toISOString();
    this.transactionWithSync((transaction) => {
      const current = transaction
        .select()
        .from(doseRecords)
        .where(eq(doseRecords.occurrenceId, dose.occurrenceId))
        .get();
      if (!current) return [];
      const delta = supplyAdjustment(current.status, 'notRecorded');
      const doseEvent = {
        id: Crypto.randomUUID(),
        occurrenceId: dose.occurrenceId,
        previousStatus: current.status,
        nextStatus: 'notRecorded' as const,
        occurredAt: now,
      };
      transaction.insert(doseEvents).values(doseEvent).run();
      const mutations: SyncMutation[] = [
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'doseEvent.append',
          entityId: doseEvent.id,
          occurredAt: now,
          data: doseEvent,
        }),
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'doseRecord.delete',
          entityId: dose.occurrenceId,
          occurredAt: now,
        }),
      ];
      transaction
        .delete(doseRecords)
        .where(
          and(
            eq(doseRecords.occurrenceId, dose.occurrenceId),
            eq(doseRecords.scheduleId, dose.schedule.id),
          ),
        )
        .run();
      if (delta !== 0) {
        transaction
          .update(medications)
          .set({
            supplyCount: sql`CASE WHEN ${medications.supplyCount} IS NULL THEN NULL ELSE ${medications.supplyCount} + ${delta} END`,
          })
          .where(eq(medications.id, dose.medication.id))
          .run();
        const updatedMedicine = transaction
          .select()
          .from(medications)
          .where(eq(medications.id, dose.medication.id))
          .get();
        if (!updatedMedicine) throw new Error('Medicine not found.');
        const supplyEvent = {
          id: Crypto.randomUUID(),
          medicineId: dose.medication.id,
          doseOccurrenceId: dose.occurrenceId,
          delta,
          resultingCount: updatedMedicine.supplyCount,
          reason: 'doseCorrected' as const,
          occurredAt: now,
        };
        transaction
          .insert(supplyEvents)
          .values({
            id: supplyEvent.id,
            medicationId: dose.medication.id,
            doseOccurrenceId: dose.occurrenceId,
            delta,
            resultingCount: supplyEvent.resultingCount,
            reason: 'doseCorrected',
            occurredAt: now,
          })
          .run();
        mutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'medicine.upsert',
            entityId: updatedMedicine.id,
            occurredAt: now,
            data: updatedMedicine,
          }),
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'supplyEvent.append',
            entityId: supplyEvent.id,
            occurredAt: now,
            data: supplyEvent,
          }),
        );
      }
      return mutations;
    });
  }

  async setSupplyCount(medicationId: string, count: number | null): Promise<void> {
    if (count !== null && (!Number.isFinite(count) || count < 0)) {
      throw new Error('Supply count must be zero or greater.');
    }
    const medication = this.db
      .select()
      .from(medications)
      .where(eq(medications.id, medicationId))
      .get();
    if (!medication) throw new Error('Medicine not found.');
    const now = new Date().toISOString();
    const delta =
      medication.supplyCount === null || count === null ? null : count - medication.supplyCount;
    const updatedMedicine = { ...medication, supplyCount: count, updatedAt: now };
    const supplyEvent = {
      id: Crypto.randomUUID(),
      medicineId: medicationId,
      doseOccurrenceId: null,
      delta,
      resultingCount: count,
      reason: 'manualCount' as const,
      occurredAt: now,
    };
    this.transactionWithSync((transaction) => {
      transaction
        .update(medications)
        .set({ supplyCount: count, updatedAt: now })
        .where(eq(medications.id, medicationId))
        .run();
      transaction
        .insert(supplyEvents)
        .values({
          id: supplyEvent.id,
          medicationId,
          doseOccurrenceId: null,
          delta,
          resultingCount: count,
          reason: 'manualCount',
          occurredAt: now,
        })
        .run();
      return [
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'medicine.upsert',
          entityId: medicationId,
          occurredAt: now,
          data: updatedMedicine,
        }),
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'supplyEvent.append',
          entityId: supplyEvent.id,
          occurredAt: now,
          data: supplyEvent,
        }),
      ];
    });
  }

  async setScheduleReminderEnabled(scheduleId: string, enabled: boolean): Promise<void> {
    this.db
      .update(schedules)
      .set({ reminderEnabled: enabled })
      .where(eq(schedules.id, scheduleId))
      .run();
  }

  async setMedicationArchived(medicationId: string, archived: boolean): Promise<void> {
    const now = new Date().toISOString();
    this.transactionWithSync((transaction) => {
      transaction
        .update(medications)
        .set({ archivedAt: archived ? now : null, updatedAt: now })
        .where(eq(medications.id, medicationId))
        .run();
      const medication = transaction
        .select()
        .from(medications)
        .where(eq(medications.id, medicationId))
        .get();
      if (!medication) throw new Error('Medicine not found.');
      return [
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'medicine.upsert',
          entityId: medicationId,
          occurredAt: now,
          data: medication,
        }),
      ];
    });
  }

  async deleteMedication(medicationId: string): Promise<void> {
    const now = new Date().toISOString();
    this.transactionWithSync((transaction) => {
      const medicationSchedules = transaction
        .select({ id: schedules.id })
        .from(schedules)
        .where(eq(schedules.medicationId, medicationId))
        .all();
      const medicationSupplyEvents = transaction
        .select({ id: supplyEvents.id })
        .from(supplyEvents)
        .where(eq(supplyEvents.medicationId, medicationId))
        .all();
      const mutations: SyncMutation[] = [];
      medicationSchedules.forEach(({ id }) => {
        const records = transaction
          .select({ occurrenceId: doseRecords.occurrenceId })
          .from(doseRecords)
          .where(eq(doseRecords.scheduleId, id))
          .all();
        const events = transaction
          .select({ id: doseEvents.id })
          .from(doseEvents)
          .where(like(doseEvents.occurrenceId, `${id}:%`))
          .all();
        records.forEach(({ occurrenceId }) => {
          mutations.push(
            syncMutationSchema.parse({
              mutationId: Crypto.randomUUID(),
              type: 'doseRecord.delete',
              entityId: occurrenceId,
              occurredAt: now,
            }),
          );
        });
        events.forEach(({ id: eventId }) => {
          mutations.push(
            syncMutationSchema.parse({
              mutationId: Crypto.randomUUID(),
              type: 'doseEvent.delete',
              entityId: eventId,
              occurredAt: now,
            }),
          );
        });
        transaction
          .delete(doseEvents)
          .where(like(doseEvents.occurrenceId, `${id}:%`))
          .run();
        mutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'schedule.delete',
            entityId: id,
            occurredAt: now,
          }),
        );
      });
      medicationSupplyEvents.forEach(({ id }) => {
        mutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'supplyEvent.delete',
            entityId: id,
            occurredAt: now,
          }),
        );
      });
      transaction.delete(medications).where(eq(medications.id, medicationId)).run();
      mutations.push(
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'medicine.delete',
          entityId: medicationId,
          occurredAt: now,
        }),
      );
      return mutations;
    });
  }

  async getSetting(key: string): Promise<string | null> {
    const value = this.db.select().from(settings).where(eq(settings.key, key)).get()?.value;
    return value === undefined ? null : settingValueSchema.parse(value);
  }

  async setSetting(key: string, value: string): Promise<void> {
    settingValueSchema.parse(value);
    this.db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run();
  }

  async saveProfileName(firstName: string, lastName: string): Promise<void> {
    const profile = {
      firstName: settingValueSchema.parse(firstName).trim(),
      lastName: settingValueSchema.parse(lastName).trim(),
      updatedAt: new Date().toISOString(),
    };
    this.transactionWithSync((transaction) => {
      const values = [
        { key: profileSettingKeys.firstName, value: profile.firstName },
        { key: profileSettingKeys.lastName, value: profile.lastName },
        {
          key: profileSettingKeys.displayName,
          value: profileDisplayName(profile),
        },
      ];
      values.forEach(({ key, value }) => {
        transaction
          .insert(settings)
          .values({ key, value })
          .onConflictDoUpdate({ target: settings.key, set: { value } })
          .run();
      });
      return [
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'profile.upsert',
          entityId: 'profile',
          occurredAt: profile.updatedAt,
          data: profile,
        }),
      ];
    });
  }
}
