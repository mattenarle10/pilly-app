import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const medications = sqliteTable('medications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  instructions: text('instructions').notNull(),
  supplyCount: real('supply_count'),
  appearanceShape: text('appearance_shape', { enum: ['round', 'oval', 'capsule'] }).notNull(),
  appearanceSize: text('appearance_size', { enum: ['small', 'medium', 'large'] }).notNull(),
  appearanceTone: text('appearance_tone', {
    enum: ['rose', 'peach', 'lavender', 'neutral'],
  }).notNull(),
  appearanceSecondaryTone: text('appearance_secondary_tone', {
    enum: ['rose', 'peach', 'lavender', 'neutral'],
  }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
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
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on'),
  createdAt: text('created_at').notNull(),
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
  doseOccurrenceId: text('dose_occurrence_id'),
  delta: real('delta'),
  resultingCount: real('resulting_count'),
  reason: text('reason', { enum: ['doseRecorded', 'doseCorrected', 'manualCount'] }).notNull(),
  occurredAt: text('occurred_at').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
