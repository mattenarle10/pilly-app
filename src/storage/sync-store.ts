import { and, asc, eq, like, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

import {
  cloudState,
  doseEvents,
  doseRecords,
  medications,
  schedules,
  settings,
  syncOutbox,
  supplyEvents,
} from './database-schema';
import { profileDisplayName, profileSettingKeys } from '@/models/profile';
import {
  syncDoseEventSchema,
  syncDoseRecordSchema,
  syncMedicineSchema,
  syncMutationSchema,
  syncProfileSchema,
  syncScheduleSchema,
  syncSupplyEventSchema,
  type BootstrapResponse,
  type CloudChange,
  type SyncMutation,
  type SyncResponse,
} from '@/models/sync';

export type CloudMigrationState = NonNullable<typeof cloudState.$inferSelect>['migrationState'];
export type CloudState = typeof cloudState.$inferSelect;
export type CloudSetupMode = 'backup' | 'restore' | 'merge';

type PillyDatabase = ReturnType<typeof drizzle>;
type PillyTransaction = Parameters<Parameters<PillyDatabase['transaction']>[0]>[0];

const stateId = 'current';

export class PillySyncStore {
  private readonly db;

  constructor(database: SQLiteDatabase) {
    this.db = drizzle(database);
  }

  getOrCreateState(): CloudState {
    const existing = this.db.select().from(cloudState).where(eq(cloudState.id, stateId)).get();
    if (existing) return existing;
    const state: CloudState = {
      id: stateId,
      accountId: null,
      deviceId: Crypto.randomUUID(),
      cursor: null,
      migrationState: 'disconnected',
      lastSuccessfulSyncAt: null,
      lastError: null,
    };
    this.db.insert(cloudState).values(state).run();
    return state;
  }

  hasLocalData(): boolean {
    const medicineCount =
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(medications)
        .get()?.count ?? 0;
    const profile = this.db
      .select()
      .from(settings)
      .where(eq(settings.key, profileSettingKeys.displayName))
      .get()?.value;
    return medicineCount > 0 || Boolean(profile?.trim());
  }

  resolveSetupState(accountId: string, hasCloudData: boolean): CloudMigrationState {
    const state = this.getOrCreateState();
    if (
      state.accountId &&
      state.accountId !== accountId &&
      (state.migrationState === 'active' || this.hasLocalData())
    ) {
      this.updateState({ accountId: state.accountId, migrationState: 'blockedAccount' });
      return 'blockedAccount';
    }
    if (state.accountId === accountId && state.migrationState === 'active') return 'active';
    const migrationState = this.hasLocalData()
      ? hasCloudData
        ? 'pendingMerge'
        : 'pendingBackup'
      : hasCloudData
        ? 'pendingRestore'
        : 'active';
    this.updateState({ accountId, migrationState });
    return migrationState;
  }

  configureAccount(
    accountId: string,
    mode: CloudSetupMode | 'empty',
    bootstrap: BootstrapResponse,
  ): void {
    const current = this.getOrCreateState();
    if (
      current.accountId &&
      current.accountId !== accountId &&
      current.migrationState !== 'disconnected'
    ) {
      throw new Error('This device is already connected to another Pilly account.');
    }
    this.db.transaction((transaction) => {
      if (mode === 'backup' || mode === 'merge') this.enqueueSnapshot(transaction, accountId);
      if (mode === 'restore' || mode === 'merge')
        this.applyChanges(transaction, accountId, bootstrap.changes);
      transaction
        .insert(cloudState)
        .values({
          id: stateId,
          accountId,
          deviceId: current.deviceId,
          cursor: bootstrap.serverCursor,
          migrationState: 'active',
          lastSuccessfulSyncAt: null,
          lastError: null,
        })
        .onConflictDoUpdate({
          target: cloudState.id,
          set: {
            accountId,
            cursor: bootstrap.serverCursor,
            migrationState: 'active',
            lastError: null,
          },
        })
        .run();
    });
  }

  disconnect(): void {
    this.updateState({ migrationState: 'disconnected', lastError: null });
  }

  listPendingMutations(accountId: string, limit = 25): SyncMutation[] {
    return this.db
      .select()
      .from(syncOutbox)
      .where(eq(syncOutbox.accountId, accountId))
      .orderBy(asc(syncOutbox.createdAt))
      .limit(Math.min(25, Math.max(0, limit)))
      .all()
      .map((row) =>
        syncMutationSchema.parse({
          mutationId: row.mutationId,
          type: row.type,
          entityId: row.entityId,
          occurredAt: row.occurredAt,
          ...(row.payload ? { data: JSON.parse(row.payload) as unknown } : {}),
        }),
      );
  }

  applySyncResponse(accountId: string, response: SyncResponse): void {
    this.db.transaction((transaction) => {
      const acknowledged = response.results
        .filter((result) => result.status !== 'rejected')
        .map((result) => result.mutationId);
      acknowledged.forEach((mutationId) => {
        transaction
          .delete(syncOutbox)
          .where(and(eq(syncOutbox.accountId, accountId), eq(syncOutbox.mutationId, mutationId)))
          .run();
      });
      response.results
        .filter((result) => result.status === 'rejected')
        .forEach((result) => {
          transaction
            .update(syncOutbox)
            .set({
              attemptCount: sql`${syncOutbox.attemptCount} + 1`,
              lastError: result.errorCode ?? 'rejected',
            })
            .where(
              and(
                eq(syncOutbox.accountId, accountId),
                eq(syncOutbox.mutationId, result.mutationId),
              ),
            )
            .run();
        });
      this.applyChanges(transaction, accountId, response.changes);
      transaction
        .update(cloudState)
        .set({
          cursor: response.serverCursor,
          lastSuccessfulSyncAt: new Date().toISOString(),
          lastError: null,
        })
        .where(and(eq(cloudState.id, stateId), eq(cloudState.accountId, accountId)))
        .run();
    });
  }

  recordError(accountId: string, message: string): void {
    this.db
      .update(cloudState)
      .set({ lastError: message })
      .where(and(eq(cloudState.id, stateId), eq(cloudState.accountId, accountId)))
      .run();
  }

  private updateState(values: Partial<Omit<CloudState, 'id' | 'deviceId'>>): void {
    const current = this.getOrCreateState();
    this.db
      .update(cloudState)
      .set(values)
      .where(and(eq(cloudState.id, stateId), eq(cloudState.deviceId, current.deviceId)))
      .run();
  }

  private enqueueSnapshot(transaction: PillyTransaction, accountId: string): void {
    const now = new Date().toISOString();
    const mutations: SyncMutation[] = [];
    const firstName = transaction
      .select()
      .from(settings)
      .where(eq(settings.key, profileSettingKeys.firstName))
      .get()?.value;
    const lastName = transaction
      .select()
      .from(settings)
      .where(eq(settings.key, profileSettingKeys.lastName))
      .get()?.value;
    if (firstName || lastName) {
      mutations.push(
        syncMutationSchema.parse({
          mutationId: Crypto.randomUUID(),
          type: 'profile.upsert',
          entityId: 'profile',
          occurredAt: now,
          data: { firstName: firstName ?? '', lastName: lastName ?? '', updatedAt: now },
        }),
      );
    }
    transaction
      .select()
      .from(medications)
      .all()
      .forEach((medicine) => {
        mutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'medicine.upsert',
            entityId: medicine.id,
            occurredAt: medicine.updatedAt,
            data: medicine,
          }),
        );
      });
    transaction
      .select()
      .from(schedules)
      .all()
      .forEach(({ reminderEnabled: _reminderEnabled, ...schedule }) => {
        mutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'schedule.upsert',
            entityId: schedule.id,
            occurredAt: schedule.createdAt,
            data: schedule,
          }),
        );
      });
    transaction
      .select()
      .from(doseRecords)
      .all()
      .forEach((record) => {
        mutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'doseRecord.upsert',
            entityId: record.occurrenceId,
            occurredAt: record.updatedAt,
            data: record,
          }),
        );
      });
    transaction
      .select()
      .from(doseEvents)
      .all()
      .forEach((event) => {
        mutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'doseEvent.append',
            entityId: event.id,
            occurredAt: event.occurredAt,
            data: event,
          }),
        );
      });
    transaction
      .select()
      .from(supplyEvents)
      .all()
      .forEach(({ medicationId, ...event }) => {
        mutations.push(
          syncMutationSchema.parse({
            mutationId: Crypto.randomUUID(),
            type: 'supplyEvent.append',
            entityId: event.id,
            occurredAt: event.occurredAt,
            data: { ...event, medicineId: medicationId },
          }),
        );
      });
    if (mutations.length > 0) this.insertOutbox(transaction, accountId, mutations);
  }

  private insertOutbox(
    transaction: PillyTransaction,
    accountId: string,
    mutations: SyncMutation[],
  ): void {
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
  }

  private applyChanges(
    transaction: PillyTransaction,
    accountId: string,
    changes: CloudChange[],
  ): void {
    const priority: Record<CloudChange['entityType'], number> = {
      profile: 0,
      medicine: 1,
      schedule: 2,
      doseRecord: 3,
      doseEvent: 4,
      supplyEvent: 5,
    };
    const ordered = [...changes].sort((left, right) => {
      const leftPriority = priority[left.entityType];
      const rightPriority = priority[right.entityType];
      if (left.deletedAt && right.deletedAt) return rightPriority - leftPriority;
      if (left.deletedAt) return 1;
      if (right.deletedAt) return -1;
      return leftPriority - rightPriority;
    });
    ordered.forEach((change) => {
      const pending = transaction
        .select({ mutationId: syncOutbox.mutationId })
        .from(syncOutbox)
        .where(
          and(
            eq(syncOutbox.accountId, accountId),
            eq(syncOutbox.entityId, change.entityId),
            like(syncOutbox.type, `${change.entityType}.%`),
          ),
        )
        .get();
      if (pending) return;
      if (change.deletedAt) this.applyDelete(transaction, change);
      else this.applyUpsert(transaction, change);
    });
  }

  private applyDelete(transaction: PillyTransaction, change: CloudChange): void {
    switch (change.entityType) {
      case 'profile':
        [
          profileSettingKeys.firstName,
          profileSettingKeys.lastName,
          profileSettingKeys.displayName,
        ].forEach((key) => transaction.delete(settings).where(eq(settings.key, key)).run());
        break;
      case 'medicine': {
        const medicineSchedules = transaction
          .select({ id: schedules.id })
          .from(schedules)
          .where(eq(schedules.medicationId, change.entityId))
          .all();
        medicineSchedules.forEach(({ id }) =>
          transaction
            .delete(doseEvents)
            .where(like(doseEvents.occurrenceId, `${id}:%`))
            .run(),
        );
        transaction.delete(medications).where(eq(medications.id, change.entityId)).run();
        break;
      }
      case 'schedule':
        transaction
          .delete(doseEvents)
          .where(like(doseEvents.occurrenceId, `${change.entityId}:%`))
          .run();
        transaction.delete(schedules).where(eq(schedules.id, change.entityId)).run();
        break;
      case 'doseRecord':
        transaction.delete(doseRecords).where(eq(doseRecords.occurrenceId, change.entityId)).run();
        break;
      case 'doseEvent':
        transaction.delete(doseEvents).where(eq(doseEvents.id, change.entityId)).run();
        break;
      case 'supplyEvent':
        transaction.delete(supplyEvents).where(eq(supplyEvents.id, change.entityId)).run();
        break;
    }
  }

  private applyUpsert(transaction: PillyTransaction, change: CloudChange): void {
    switch (change.entityType) {
      case 'profile': {
        const profile = syncProfileSchema.parse(change.data);
        [
          { key: profileSettingKeys.firstName, value: profile.firstName },
          { key: profileSettingKeys.lastName, value: profile.lastName },
          { key: profileSettingKeys.displayName, value: profileDisplayName(profile) },
        ].forEach(({ key, value }) =>
          transaction
            .insert(settings)
            .values({ key, value })
            .onConflictDoUpdate({ target: settings.key, set: { value } })
            .run(),
        );
        break;
      }
      case 'medicine': {
        const medicine = syncMedicineSchema.parse(change.data);
        transaction
          .insert(medications)
          .values(medicine)
          .onConflictDoUpdate({ target: medications.id, set: medicine })
          .run();
        break;
      }
      case 'schedule': {
        const schedule = syncScheduleSchema.parse(change.data);
        transaction
          .insert(schedules)
          .values({ ...schedule, reminderEnabled: false })
          .onConflictDoUpdate({ target: schedules.id, set: schedule })
          .run();
        break;
      }
      case 'doseRecord': {
        const record = syncDoseRecordSchema.parse(change.data);
        transaction
          .insert(doseRecords)
          .values(record)
          .onConflictDoUpdate({ target: doseRecords.occurrenceId, set: record })
          .run();
        break;
      }
      case 'doseEvent': {
        const event = syncDoseEventSchema.parse(change.data);
        transaction
          .insert(doseEvents)
          .values(event)
          .onConflictDoUpdate({ target: doseEvents.id, set: event })
          .run();
        break;
      }
      case 'supplyEvent': {
        const event = syncSupplyEventSchema.parse(change.data);
        const { medicineId, ...values } = event;
        transaction
          .insert(supplyEvents)
          .values({ ...values, medicationId: medicineId })
          .onConflictDoUpdate({
            target: supplyEvents.id,
            set: { ...values, medicationId: medicineId },
          })
          .run();
        break;
      }
    }
  }
}
