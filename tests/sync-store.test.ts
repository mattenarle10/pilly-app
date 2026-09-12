import type { SQLiteDatabase } from 'expo-sqlite';

import type { BootstrapResponse } from '@/models/sync';
import { migrateDatabase } from '@/storage/migrate-database';
import { PillySyncStore } from '@/storage/sync-store';

jest.mock('expo-crypto', () => {
  let nextId = 1;
  return {
    randomUUID: () => `00000000-0000-4000-8000-${(nextId++).toString(16).padStart(12, '0')}`,
  };
});

type NativeStatement = {
  run: (...values: unknown[]) => { changes: number | bigint; lastInsertRowid: number | bigint };
  all: (...values: unknown[]) => unknown[];
  get: (...values: unknown[]) => unknown;
  setReturnArrays: (enabled: boolean) => void;
};

type NativeDatabase = {
  exec: (source: string) => void;
  prepare: (source: string) => NativeStatement;
  close: () => void;
};

const { DatabaseSync } = jest.requireActual<{
  DatabaseSync: new (source: string) => NativeDatabase;
}>('node:sqlite');

function expoDatabase(native: NativeDatabase): SQLiteDatabase {
  return {
    execAsync: async (source: string) => native.exec(source),
    getFirstAsync: async <Row>(source: string) =>
      (native.prepare(source).get() as Row | undefined) ?? null,
    prepareSync: (source: string) => ({
      executeSync: (values: unknown[] = []) => {
        const statement = native.prepare(source);
        let result: ReturnType<typeof statement.run> | null = null;
        const run = () => (result ??= statement.run(...values));
        return {
          get changes() {
            return Number(run().changes);
          },
          get lastInsertRowId() {
            return Number(run().lastInsertRowid);
          },
          getAllSync: () => statement.all(...values),
          getFirstSync: () => statement.get(...values) ?? null,
        };
      },
      executeForRawResultSync: (values: unknown[] = []) => {
        const statement = native.prepare(source);
        statement.setReturnArrays(true);
        return { getAllSync: () => statement.all(...values) };
      },
    }),
  } as unknown as SQLiteDatabase;
}

describe('PillySyncStore merge setup', () => {
  test('keeps local medicines, imports cloud medicines, and queues the local snapshot', async () => {
    const native = new DatabaseSync(':memory:');
    const database = expoDatabase(native);
    await migrateDatabase(database);
    native
      .prepare(
        `INSERT INTO medications (
          id, name, instructions, supply_count, form, appearance_shape, appearance_size,
          appearance_color, appearance_secondary_color, created_at, updated_at, archived_at,
          time_zone_identifier
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'd7bf17a4-3b0c-4c61-9155-7102fe0769f2',
        'Local capsule',
        '',
        14,
        'capsule',
        'capsule',
        'medium',
        '#F3CCD7',
        '#FBE9DE',
        '2026-09-01T00:00:00.000Z',
        '2026-09-01T00:00:00.000Z',
        null,
        'Asia/Manila',
      );
    const remoteId = 'f4de17a4-3b0c-4c61-9155-7102fe0769f3';
    const bootstrap: BootstrapResponse = {
      serverCursor: 4,
      hasCloudData: true,
      entitlement: { isActive: true, productId: 'plus', expiresAt: null },
      changes: [
        {
          entityType: 'medicine',
          entityId: remoteId,
          revision: 1,
          schemaVersion: 1,
          mutationId: 'a4de17a4-3b0c-4c61-9155-7102fe0769f4',
          updatedAt: '2026-09-02T00:00:00.000Z',
          deletedAt: null,
          data: {
            id: remoteId,
            name: 'Cloud tablet',
            instructions: '',
            supplyCount: 7,
            form: 'tablet',
            tabletShape: 'round',
            appearanceSize: 'small',
            appearanceColor: '#ECEAF7',
            appearanceSecondaryColor: '#F3CCD7',
            createdAt: '2026-09-02T00:00:00.000Z',
            updatedAt: '2026-09-02T00:00:00.000Z',
            archivedAt: null,
            timeZoneIdentifier: 'Asia/Manila',
          },
        },
      ],
    };
    const store = new PillySyncStore(database);

    expect(store.resolveSetupState('account-1', true)).toBe('pendingMerge');
    store.configureAccount('account-1', 'merge', bootstrap);

    const medicines = native.prepare('SELECT id, name FROM medications ORDER BY name').all() as {
      id: string;
      name: string;
    }[];
    expect(medicines).toEqual([
      { id: remoteId, name: 'Cloud tablet' },
      { id: 'd7bf17a4-3b0c-4c61-9155-7102fe0769f2', name: 'Local capsule' },
    ]);
    expect(store.listPendingMutations('account-1')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'medicine.upsert',
          entityId: 'd7bf17a4-3b0c-4c61-9155-7102fe0769f2',
        }),
      ]),
    );
    expect(store.getOrCreateState()).toMatchObject({
      accountId: 'account-1',
      migrationState: 'active',
      cursor: 4,
    });
    native.close();
  });
});
