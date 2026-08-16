import type { SQLiteDatabase } from 'expo-sqlite';

const databaseVersion = 6;

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

  if (currentVersion < 3) {
    await database.execAsync(`
      ALTER TABLE medications ADD COLUMN updated_at TEXT;
      ALTER TABLE medications ADD COLUMN archived_at TEXT;
      UPDATE medications SET updated_at = created_at WHERE updated_at IS NULL;

      ALTER TABLE schedules ADD COLUMN starts_on TEXT;
      ALTER TABLE schedules ADD COLUMN ends_on TEXT;
      ALTER TABLE schedules ADD COLUMN created_at TEXT;
      UPDATE schedules
      SET starts_on = substr(
            (SELECT created_at FROM medications WHERE medications.id = schedules.medication_id),
            1,
            10
          ),
          created_at = (
            SELECT created_at FROM medications WHERE medications.id = schedules.medication_id
          )
      WHERE starts_on IS NULL OR created_at IS NULL;

      CREATE TABLE supply_events_v3 (
        id TEXT PRIMARY KEY NOT NULL,
        medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        dose_occurrence_id TEXT,
        delta REAL,
        resulting_count REAL,
        reason TEXT NOT NULL CHECK(reason IN ('doseRecorded', 'doseCorrected', 'manualCount')),
        occurred_at TEXT NOT NULL
      );
      INSERT INTO supply_events_v3 (
        id,
        medication_id,
        dose_occurrence_id,
        delta,
        resulting_count,
        reason,
        occurred_at
      )
      SELECT id, medication_id, dose_occurrence_id, delta, NULL, reason, occurred_at
      FROM supply_events;
      DROP TABLE supply_events;
      ALTER TABLE supply_events_v3 RENAME TO supply_events;
      CREATE INDEX supply_events_medication_id_idx ON supply_events(medication_id);
    `);
  }

  if (currentVersion < 4) {
    await database.execAsync(`
      ALTER TABLE medications ADD COLUMN appearance_shape TEXT NOT NULL DEFAULT 'capsule'
        CHECK(appearance_shape IN ('round', 'oval', 'capsule'));
      ALTER TABLE medications ADD COLUMN appearance_size TEXT NOT NULL DEFAULT 'medium'
        CHECK(appearance_size IN ('small', 'medium', 'large'));
      ALTER TABLE medications ADD COLUMN appearance_tone TEXT NOT NULL DEFAULT 'rose'
        CHECK(appearance_tone IN ('rose', 'peach', 'lavender', 'neutral'));
    `);
  }

  if (currentVersion < 5) {
    await database.execAsync(`
      ALTER TABLE medications ADD COLUMN appearance_secondary_tone TEXT NOT NULL DEFAULT 'rose'
        CHECK(appearance_secondary_tone IN ('rose', 'peach', 'lavender', 'neutral'));
    `);
  }

  if (currentVersion < 6) {
    await database.execAsync(`
      ALTER TABLE medications ADD COLUMN appearance_color TEXT NOT NULL DEFAULT '#F3CCD7';
      ALTER TABLE medications ADD COLUMN appearance_secondary_color TEXT NOT NULL DEFAULT '#FBE9DE';
      UPDATE medications
      SET appearance_color = CASE appearance_tone
            WHEN 'peach' THEN '#FBE9DE'
            WHEN 'lavender' THEN '#ECEAF7'
            WHEN 'neutral' THEN '#F3F1EB'
            ELSE '#F3CCD7'
          END,
          appearance_secondary_color = CASE appearance_secondary_tone
            WHEN 'peach' THEN '#FBE9DE'
            WHEN 'lavender' THEN '#ECEAF7'
            WHEN 'neutral' THEN '#F3F1EB'
            ELSE '#F3CCD7'
          END;
    `);
  }
  await database.execAsync(`PRAGMA user_version = ${databaseVersion}`);
}
