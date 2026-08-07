import type { SQLiteDatabase } from 'expo-sqlite';

const databaseVersion = 2;

export async function migrateDatabase(database: SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const result = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;
  if (currentVersion >= databaseVersion) return;

  if (currentVersion === 0) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS medications (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        instructions TEXT NOT NULL,
        supply_count REAL,
        created_at TEXT NOT NULL,
        time_zone_identifier TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY NOT NULL,
        medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        hour INTEGER NOT NULL,
        minute INTEGER NOT NULL,
        weekday_mask INTEGER NOT NULL,
        sort_order INTEGER NOT NULL,
        reminder_enabled INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS dose_records (
        occurrence_id TEXT PRIMARY KEY NOT NULL,
        schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status IN ('taken', 'skipped')),
        scheduled_at TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS dose_events (
        id TEXT PRIMARY KEY NOT NULL,
        occurrence_id TEXT NOT NULL,
        previous_status TEXT NOT NULL,
        next_status TEXT NOT NULL,
        occurred_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS schedules_medication_id_idx ON schedules(medication_id);
      CREATE INDEX IF NOT EXISTS dose_events_occurrence_id_idx ON dose_events(occurrence_id);
    `);
  }

  if (currentVersion < 2) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS supply_events (
        id TEXT PRIMARY KEY NOT NULL,
        medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        dose_occurrence_id TEXT NOT NULL,
        delta REAL NOT NULL,
        reason TEXT NOT NULL CHECK(reason IN ('doseRecorded', 'doseCorrected')),
        occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS supply_events_medication_id_idx ON supply_events(medication_id);
    `);
  }
  await database.execAsync(`PRAGMA user_version = ${databaseVersion}`);
}
