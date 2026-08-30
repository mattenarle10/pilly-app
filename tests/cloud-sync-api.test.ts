import {
  CloudSyncApiError,
  fetchCloudBootstrap,
  pushCloudMutations,
} from '@/services/cloud-sync-api';
import { getValidAccountSession } from '@/services/account-session';

jest.mock('@/services/account-session', () => ({ getValidAccountSession: jest.fn() }));

const mockedSession = jest.mocked(getValidAccountSession);
const originalUrl = process.env.EXPO_PUBLIC_PILLY_API_URL;

describe('cloud sync API', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_PILLY_API_URL = 'https://api.pilly.test/';
    mockedSession.mockResolvedValue({
      user: { id: 'user-1', email: 'm@example.com', displayName: 'M', provider: 'apple' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 60_000,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_PILLY_API_URL = originalUrl;
  });

  test('loads and validates bootstrap state with a bearer token', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          serverCursor: 0,
          hasCloudData: false,
          changes: [],
          entitlement: { isActive: true, productId: 'plus', expiresAt: null },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(fetchCloudBootstrap()).resolves.toMatchObject({ hasCloudData: false });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.pilly.test/v1/bootstrap',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  test('maps entitlement denial to a stable client error', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 'PLUS_REQUIRED', message: 'Pilly Plus is required.' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    await expect(
      pushCloudMutations({
        deviceId: '4ed9c04a-7747-4211-a786-8e5591b04e21',
        cursor: null,
        mutations: [],
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<CloudSyncApiError>>({ code: 'plus-required' }),
    );
  });
});
