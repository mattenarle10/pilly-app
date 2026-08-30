import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from '@/storage/migrate-database';

function databaseAt(version: number) {
  const execAsync = jest.fn().mockResolvedValue(undefined);
  const getFirstAsync = jest.fn().mockResolvedValue({ user_version: version });
  return {
    database: { execAsync, getFirstAsync } as unknown as SQLiteDatabase,
    execAsync,
  };
}

describe('database appearance migration', () => {
  test('maps the legacy palette columns to editable hex colors', async () => {
    const { database, execAsync } = databaseAt(5);

    await migrateDatabase(database);

    expect(execAsync).toHaveBeenCalledWith(
      expect.stringContaining('ALTER TABLE medications ADD COLUMN appearance_color'),
    );
    expect(execAsync).toHaveBeenCalledWith(expect.stringContaining("WHEN 'peach' THEN '#FBE9DE'"));
    expect(execAsync).toHaveBeenLastCalledWith('PRAGMA user_version = 7');
  });

  test('adds durable cloud state without changing existing medicine tables', async () => {
    const { database, execAsync } = databaseAt(6);

    await migrateDatabase(database);

    expect(execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_outbox'),
    );
    expect(execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS cloud_state'),
    );
    expect(execAsync).toHaveBeenLastCalledWith('PRAGMA user_version = 7');
  });

  test('does not repeat schema work once version 7 is installed', async () => {
    const { database, execAsync } = databaseAt(7);

    await migrateDatabase(database);

    expect(execAsync).toHaveBeenCalledTimes(1);
    expect(execAsync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  });
});
