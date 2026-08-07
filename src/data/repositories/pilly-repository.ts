import { and, asc, eq, inArray, sql } from 'drizzle-orm';
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
  type CreateMedicationInput,
  type Medication,
} from '@/domain/medication';
import {
  dateForSchedule,
  isScheduledOn,
  occurrenceId,
  scheduleSchema,
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
          })
          .run();
      });
    });
    return { medicationId, schedules: createdSchedules };
  }

  async listMedications(): Promise<Medication[]> {
    return this.db
      .select()
      .from(medications)
      .orderBy(asc(medications.createdAt))
      .all()
      .map((row) => medicationSchema.parse(row));
  }

  async listScheduledDoses(date: Date): Promise<ScheduledDose[]> {
    const joined = this.db
      .select({ medication: medications, schedule: schedules })
      .from(schedules)
      .innerJoin(medications, eq(schedules.medicationId, medications.id))
      .orderBy(asc(schedules.hour), asc(schedules.minute), asc(schedules.sortOrder))
      .all();
    const active = joined.filter(({ schedule }) =>
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
