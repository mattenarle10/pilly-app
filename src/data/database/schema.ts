import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const medications = sqliteTable('medications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  instructions: text('instructions').notNull(),
  supplyCount: real('supply_count'),
  createdAt: text('created_at').notNull(),
  timeZoneIdentifier: text('time_zone_identifier').notNull(),
});

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  hour: integer('hour').notNull(),
  minute: integer('minute').notNull(),
  weekdayMask: integer('weekday_mask').notNull(),
  sortOrder: integer('sort_order').notNull(),
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull(),
});

export const doseRecords = sqliteTable('dose_records', {
  occurrenceId: text('occurrence_id').primaryKey(),
  scheduleId: text('schedule_id')
    .notNull()
    .references(() => schedules.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['taken', 'skipped'] }).notNull(),
  scheduledAt: text('scheduled_at').notNull(),
  recordedAt: text('recorded_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const doseEvents = sqliteTable('dose_events', {
  id: text('id').primaryKey(),
  occurrenceId: text('occurrence_id').notNull(),
  previousStatus: text('previous_status', { enum: ['notRecorded', 'taken', 'skipped'] }).notNull(),
  nextStatus: text('next_status', { enum: ['notRecorded', 'taken', 'skipped'] }).notNull(),
  occurredAt: text('occurred_at').notNull(),
});

export const supplyEvents = sqliteTable('supply_events', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  doseOccurrenceId: text('dose_occurrence_id').notNull(),
  delta: real('delta').notNull(),
  reason: text('reason', { enum: ['doseRecorded', 'doseCorrected'] }).notNull(),
  occurredAt: text('occurred_at').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
