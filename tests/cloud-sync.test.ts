import type { PillySyncStore } from '@/storage/sync-store';
import { pushCloudMutations } from '@/services/cloud-sync-api';
import { synchronizeCloudState } from '@/services/cloud-sync';

jest.mock('@/services/cloud-sync-api', () => ({ pushCloudMutations: jest.fn() }));

const mockedPush = jest.mocked(pushCloudMutations);

describe('cloud sync coordinator', () => {
  afterEach(() => jest.clearAllMocks());

  test('does nothing until the account explicitly activates backup', async () => {
    const store = {
      getOrCreateState: jest.fn(() => ({
        accountId: 'account-1',
        migrationState: 'pendingBackup',
      })),
    } as unknown as PillySyncStore;

    await expect(synchronizeCloudState(store, 'account-1')).resolves.toEqual({ changeCount: 0 });
    expect(mockedPush).not.toHaveBeenCalled();
  });

  test('sends one bounded batch and applies the validated response', async () => {
    const mutations = [
      {
        mutationId: 'de8f97c2-4273-409b-9d96-b0a84042d31a',
        type: 'medicine.delete' as const,
        entityId: 'ca6f060d-45c4-48e1-a8fd-4293d20e9065',
        occurredAt: '2026-08-30T05:00:00.000Z',
      },
    ];
    const response = {
      serverCursor: 2,
      results: [{ mutationId: mutations[0]!.mutationId, status: 'applied' as const }],
      changes: [],
      entitlement: { isActive: true, productId: 'plus', expiresAt: null },
    };
    const store = {
      getOrCreateState: jest.fn(() => ({
        accountId: 'account-1',
        migrationState: 'active',
        deviceId: 'e2c5a082-488c-455f-9d2f-6ce5c66d7228',
        cursor: 1,
      })),
      listPendingMutations: jest.fn(() => mutations),
      applySyncResponse: jest.fn(),
    } as unknown as PillySyncStore;
    mockedPush.mockResolvedValue(response);

    await expect(synchronizeCloudState(store, 'account-1')).resolves.toEqual({ changeCount: 0 });
    expect(mockedPush).toHaveBeenCalledWith({
      deviceId: 'e2c5a082-488c-455f-9d2f-6ce5c66d7228',
      cursor: 1,
      mutations,
    });
    expect(store.applySyncResponse).toHaveBeenCalledWith('account-1', response);
  });
});
