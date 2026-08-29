import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

import {
  getValidAccountSession,
  restoreAccountSession,
  signInWithProvider,
  signOutAccount,
} from '@/services/account-session';

const mockPromptAsync = jest.fn();

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  ResponseType: { Code: 'code' },
  TokenTypeHint: { RefreshToken: 'refresh_token' },
  exchangeCodeAsync: jest.fn(),
  fetchDiscoveryAsync: jest.fn(),
  fetchUserInfoAsync: jest.fn(),
  makeRedirectUri: jest.fn(() => 'pilly-app://auth/callback'),
  refreshAsync: jest.fn(),
  revokeAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(async () => true),
  setItemAsync: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));

const mockAuthRequest = jest.mocked(AuthSession.AuthRequest);
const mockFetchDiscovery = jest.mocked(AuthSession.fetchDiscoveryAsync);
const mockExchangeCode = jest.mocked(AuthSession.exchangeCodeAsync);
const mockRefresh = jest.mocked(AuthSession.refreshAsync);
const mockRevoke = jest.mocked(AuthSession.revokeAsync);
const mockFetchUserInfo = jest.mocked(AuthSession.fetchUserInfoAsync);
const mockGetItem = jest.mocked(SecureStore.getItemAsync);
const mockSetItem = jest.mocked(SecureStore.setItemAsync);
const mockDeleteItem = jest.mocked(SecureStore.deleteItemAsync);

const discovery = {
  authorizationEndpoint: 'https://auth.example.com/oauth2/authorize',
  tokenEndpoint: 'https://auth.example.com/oauth2/token',
  userInfoEndpoint: 'https://auth.example.com/oauth2/userInfo',
  revocationEndpoint: 'https://auth.example.com/oauth2/revoke',
};

const token = {
  accessToken: 'access-token',
  idToken: 'id-token',
  refreshToken: 'refresh-token',
  issuedAt: 1_000,
  expiresIn: 3_600,
} as unknown as AuthSession.TokenResponse;

const userInfo = {
  sub: 'account-1',
  email: 'matt@example.com',
  name: 'Matthew',
};

describe('account session service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthRequest.mockImplementation(
      () =>
        ({
          codeVerifier: 'pkce-verifier',
          promptAsync: mockPromptAsync,
        }) as unknown as AuthSession.AuthRequest,
    );
    process.env.EXPO_PUBLIC_PILLY_AUTH_DOMAIN = 'https://auth.example.com';
    process.env.EXPO_PUBLIC_PILLY_AUTH_CLIENT_ID = 'mobile-client';
    process.env.EXPO_PUBLIC_PILLY_AUTH_ISSUER = 'https://issuer.example.com/pool';
    mockFetchDiscovery.mockResolvedValue(discovery);
    mockFetchUserInfo.mockResolvedValue(userInfo);
    mockExchangeCode.mockResolvedValue(token);
    mockRefresh.mockResolvedValue({
      ...token,
      refreshToken: undefined,
    } as AuthSession.TokenResponse);
    mockRevoke.mockResolvedValue(true);
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockDeleteItem.mockResolvedValue(undefined);
  });

  test.each([
    ['apple' as const, 'SignInWithApple'],
    ['google' as const, 'Google'],
  ])(
    'routes %s through Cognito authorization code with PKCE',
    async (provider, identityProvider) => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'authorization-code' },
      });

      const session = await signInWithProvider(provider);

      expect(mockAuthRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'mobile-client',
          redirectUri: 'pilly-app://auth/callback',
          responseType: 'code',
          usePKCE: true,
          extraParams: { identity_provider: identityProvider },
        }),
      );
      expect(mockExchangeCode).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'mobile-client',
          code: 'authorization-code',
          extraParams: { code_verifier: 'pkce-verifier' },
        }),
        discovery,
      );
      expect(session?.user).toEqual({
        id: 'account-1',
        email: 'matt@example.com',
        displayName: 'Matthew',
        provider,
      });
      expect(mockSetItem).toHaveBeenCalledWith(
        'pilly.account-session.v1',
        expect.stringContaining('refresh-token'),
        expect.any(Object),
      );
    },
  );

  test('treats closing the provider as cancellation', async () => {
    mockPromptAsync.mockResolvedValue({ type: 'cancel' });

    await expect(signInWithProvider('apple')).resolves.toBeNull();
    expect(mockExchangeCode).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test('refreshes an expired token and preserves its refresh token', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({
        user: { id: 'account-1', email: 'matt@example.com', displayName: 'Matthew' },
        accessToken: 'expired-access-token',
        idToken: 'expired-id-token',
        refreshToken: 'original-refresh-token',
        expiresAt: 1,
      }),
    );
    const session = await getValidAccountSession();

    expect(mockRefresh).toHaveBeenCalledWith(
      { clientId: 'mobile-client', refreshToken: 'original-refresh-token' },
      discovery,
    );
    expect(session?.refreshToken).toBe('original-refresh-token');
    expect(session?.user.provider).toBe('google');
  });

  test('restores legacy Google sessions that predate provider tracking', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({
        user: { id: 'account-1', email: 'matt@example.com', displayName: 'Matthew' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 60_000,
      }),
    );

    await expect(restoreAccountSession()).resolves.toMatchObject({
      user: { provider: 'google' },
    });
  });

  test('removes corrupt secure storage instead of blocking the local app', async () => {
    mockGetItem.mockResolvedValue('not-json');

    await expect(restoreAccountSession()).resolves.toBeNull();
    expect(mockDeleteItem).toHaveBeenCalledWith('pilly.account-session.v1', expect.any(Object));
  });

  test('clears local credentials even if remote revocation fails', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({
        user: { id: 'account-1', email: 'matt@example.com', displayName: 'Matthew' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 60_000,
      }),
    );
    mockRevoke.mockRejectedValue(new Error('offline'));

    await expect(signOutAccount()).resolves.toBeUndefined();
    expect(mockDeleteItem).toHaveBeenCalled();
  });
});
