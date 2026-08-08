import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import {
  doseEvents,
  doseRecords,
  medications,
  schedules,
  settings,
  supplyEvents,
} from '@/data/database';
import {
  createMedicationSchema,
  medicationSchema,
  updateMedicationSchema,
  type CreateMedicationInput,
  type Medication,
  type UpdateMedicationInput,
} from '@/domain/medication';
import {
  dateForSchedule,
  isScheduledOn,
  occurrenceId,
  scheduleSchema,
  toLocalDate,
  type Schedule,
} from '@/domain/schedule';
import type { DoseStatus } from '@/domain/dose';
import { supplyAdjustment } from '@/domain/supply';

export type ScheduledDose = {
  occurrenceId: string;
  medication: Medication;
  schedule: Schedule;
  scheduledAt: Date;
  status: DoseStatus;
  recordedAt: Date | null;
};

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

export type MedicationDetail = {
  medication: Medication;
  schedules: Schedule[];
};

export type ReminderSchedule = CreatedMedication['schedules'][number];

const settingValueSchema = z.string();

export class PillyRepository {
  private readonly db;

  constructor(database: SQLiteDatabase) {
    this.db = drizzle(database);
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
    this.db.transaction((transaction) => {
      transaction
        .insert(medications)
        .values({
          id: medicationId,
          name: validated.name,
          instructions: validated.instructions,
          supplyCount: validated.supplyCount,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
          timeZoneIdentifier,
        })
        .run();
      createdSchedules.forEach((schedule, index) => {
        transaction
          .insert(schedules)
          .values({
            id: schedule.id,
            medicationId,
            hour: schedule.hour,
            minute: schedule.minute,
            weekdayMask: schedule.weekdayMask,
            sortOrder: index,
            reminderEnabled: schedule.reminderEnabled,
            startsOn,
            endsOn: null,
            createdAt: now,
          })
          .run();
      });
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
    const now = new Date();
    const effectiveDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startsOn = toLocalDate(effectiveDate);
    const endsOn = toLocalDate(now);
    const createdAt = now.toISOString();
    const createdSchedules = validated.schedules.map((schedule) => ({
      ...schedule,
      id: Crypto.randomUUID(),
    }));

    this.db.transaction((transaction) => {
      transaction
        .update(medications)
        .set({
          name: validated.name,
          instructions: validated.instructions,
          updatedAt: createdAt,
        })
        .where(eq(medications.id, medicationId))
        .run();
      transaction
        .update(schedules)
        .set({ endsOn })
        .where(and(eq(schedules.medicationId, medicationId), isNull(schedules.endsOn)))
        .run();
      createdSchedules.forEach((schedule, index) => {
        transaction
          .insert(schedules)
          .values({
            id: schedule.id,
            medicationId,
            hour: schedule.hour,
            minute: schedule.minute,
            weekdayMask: schedule.weekdayMask,
            sortOrder: index,
            reminderEnabled: schedule.reminderEnabled,
            startsOn,
            endsOn: null,
            createdAt,
          })
          .run();
      });
    });
    return { medicationId, schedules: createdSchedules };
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

  async listScheduledDoses(date: Date): Promise<ScheduledDose[]> {
    const joined = this.db
      .select({ medication: medications, schedule: schedules })
      .from(schedules)
      .innerJoin(medications, eq(schedules.medicationId, medications.id))
      .where(isNull(medications.archivedAt))
      .orderBy(asc(schedules.hour), asc(schedules.minute), asc(schedules.sortOrder))
      .all();
    const localDate = toLocalDate(date);
    const active = joined.filter(
      ({ schedule }) =>
        schedule.startsOn <= localDate &&
        (schedule.endsOn === null || schedule.endsOn >= localDate) &&
        isScheduledOn(scheduleSchema.parse(schedule), date),
    );
    const ids = active.map(({ schedule }) => occurrenceId(schedule.id, date));
    const records =
      ids.length === 0
        ? []
        : this.db.select().from(doseRecords).where(inArray(doseRecords.occurrenceId, ids)).all();
    const byId = new Map(records.map((record) => [record.occurrenceId, record]));

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
  }

  async recordDose(
    dose: ScheduledDose,
    nextStatus: Exclude<DoseStatus, 'notRecorded'>,
  ): Promise<void> {
    const now = new Date().toISOString();
    this.db.transaction((transaction) => {
      const current = transaction
        .select()
        .from(doseRecords)
        .where(eq(doseRecords.occurrenceId, dose.occurrenceId))
        .get();
      const delta = supplyAdjustment(current?.status ?? 'notRecorded', nextStatus);
      transaction
        .insert(doseEvents)
        .values({
          id: Crypto.randomUUID(),
          occurrenceId: dose.occurrenceId,
          previousStatus: current?.status ?? 'notRecorded',
          nextStatus,
          occurredAt: now,
        })
        .run();
      if (delta !== 0) {
        transaction
          .update(medications)
          .set({
            supplyCount: sql`CASE WHEN ${medications.supplyCount} IS NULL THEN NULL ELSE MAX(0, ${medications.supplyCount} + ${delta}) END`,
          })
          .where(eq(medications.id, dose.medication.id))
          .run();
        transaction
          .insert(supplyEvents)
          .values({
            id: Crypto.randomUUID(),
            medicationId: dose.medication.id,
            doseOccurrenceId: dose.occurrenceId,
            delta,
            reason: 'doseRecorded',
            occurredAt: now,
          })
          .run();
      }
      transaction
        .insert(doseRecords)
        .values({
          occurrenceId: dose.occurrenceId,
          scheduleId: dose.schedule.id,
          status: nextStatus,
          scheduledAt: dose.scheduledAt.toISOString(),
          recordedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: doseRecords.occurrenceId,
          set: { status: nextStatus, recordedAt: now, updatedAt: now },
        })
        .run();
    });
  }

  async undoDose(dose: ScheduledDose): Promise<void> {
    const now = new Date().toISOString();
    this.db.transaction((transaction) => {
      const current = transaction
        .select()
        .from(doseRecords)
        .where(eq(doseRecords.occurrenceId, dose.occurrenceId))
        .get();
      if (!current) return;
      const delta = supplyAdjustment(current.status, 'notRecorded');
      transaction
        .insert(doseEvents)
        .values({
          id: Crypto.randomUUID(),
          occurrenceId: dose.occurrenceId,
          previousStatus: current.status,
          nextStatus: 'notRecorded',
          occurredAt: now,
        })
        .run();
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
        transaction
          .insert(supplyEvents)
          .values({
            id: Crypto.randomUUID(),
            medicationId: dose.medication.id,
            doseOccurrenceId: dose.occurrenceId,
            delta,
            reason: 'doseCorrected',
            occurredAt: now,
          })
          .run();
      }
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
    this.db.transaction((transaction) => {
      transaction
        .update(medications)
        .set({ supplyCount: count, updatedAt: now })
        .where(eq(medications.id, medicationId))
        .run();
      transaction
        .insert(supplyEvents)
        .values({
          id: Crypto.randomUUID(),
          medicationId,
          doseOccurrenceId: null,
          delta,
          resultingCount: count,
          reason: 'manualCount',
          occurredAt: now,
        })
        .run();
    });
  }

  async setMedicationArchived(medicationId: string, archived: boolean): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .update(medications)
      .set({ archivedAt: archived ? now : null, updatedAt: now })
      .where(eq(medications.id, medicationId))
      .run();
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
}
