import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { z } from 'zod';

import type { AccountSession, AccountUser } from '@/models/account';

WebBrowser.maybeCompleteAuthSession();

const sessionKey = 'pilly.account-session.v1';
const redirectUri = AuthSession.makeRedirectUri({ native: 'pilly-app://auth/callback' });
const authScopes = ['openid', 'email', 'profile', 'pilly-api/sync'];
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const authEnvironmentSchema = z.object({
  domain: z
    .string()
    .url()
    .transform((value) => value.replace(/\/$/, '')),
  clientId: z.string().min(1),
  issuer: z
    .string()
    .url()
    .transform((value) => value.replace(/\/$/, '')),
});

const accountUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
});

const accountSessionSchema = z.object({
  user: accountUserSchema,
  accessToken: z.string().min(1),
  idToken: z.string().min(1).optional(),
  refreshToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
});

const userInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).optional(),
  given_name: z.string().min(1).optional(),
});

type AuthEnvironment = z.infer<typeof authEnvironmentSchema>;

let discoveryPromise: ReturnType<typeof AuthSession.fetchDiscoveryAsync> | undefined;

function readAuthEnvironment(): AuthEnvironment | null {
  const values = {
    domain: process.env.EXPO_PUBLIC_PILLY_AUTH_DOMAIN,
    clientId: process.env.EXPO_PUBLIC_PILLY_AUTH_CLIENT_ID,
    issuer: process.env.EXPO_PUBLIC_PILLY_AUTH_ISSUER,
  };
  const presentCount = Object.values(values).filter(Boolean).length;
  if (presentCount === 0) return null;
  if (presentCount !== Object.keys(values).length) {
    throw new Error('Pilly account configuration is incomplete.');
  }
  return authEnvironmentSchema.parse(values);
}

function requireAuthEnvironment(): AuthEnvironment {
  const environment = readAuthEnvironment();
  if (!environment) throw new Error('Pilly account sign-in is not configured.');
  return environment;
}

async function getDiscovery(environment: AuthEnvironment) {
  discoveryPromise ??= AuthSession.fetchDiscoveryAsync(environment.issuer);
  const discovery = await discoveryPromise;
  const expectedDomain = `${environment.domain}/`;
  if (
    !discovery.authorizationEndpoint?.startsWith(expectedDomain) ||
    !discovery.tokenEndpoint?.startsWith(expectedDomain) ||
    !discovery.userInfoEndpoint?.startsWith(expectedDomain)
  ) {
    discoveryPromise = undefined;
    throw new Error('The Pilly account provider is unavailable.');
  }
  return discovery;
}

async function readStoredSession(): Promise<AccountSession | null> {
  if (!(await SecureStore.isAvailableAsync())) return null;
  const stored = await SecureStore.getItemAsync(sessionKey, secureStoreOptions);
  if (!stored) return null;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    await SecureStore.deleteItemAsync(sessionKey, secureStoreOptions);
    return null;
  }
  const parsed = accountSessionSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  await SecureStore.deleteItemAsync(sessionKey, secureStoreOptions);
  return null;
}

async function storeSession(session: AccountSession): Promise<void> {
  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error('Secure account storage is unavailable on this device.');
  }
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session), secureStoreOptions);
}

function toAccountUser(userInfo: unknown): AccountUser {
  const user = userInfoSchema.parse(userInfo);
  return {
    id: user.sub,
    email: user.email,
    displayName: user.name ?? user.given_name ?? user.email,
  };
}

async function createSession(
  token: AuthSession.TokenResponse,
  discovery: AuthSession.DiscoveryDocument,
  refreshToken = token.refreshToken,
): Promise<AccountSession> {
  if (!refreshToken) throw new Error('The account provider did not return a refresh token.');
  const user = toAccountUser(await AuthSession.fetchUserInfoAsync(token, discovery));
  const session: AccountSession = {
    user,
    accessToken: token.accessToken,
    idToken: token.idToken,
    refreshToken,
    expiresAt: (token.issuedAt + (token.expiresIn ?? 3600)) * 1000,
  };
  await storeSession(session);
  return session;
}

export function isAccountSignInConfigured(): boolean {
  return readAuthEnvironment() !== null;
}

export async function restoreAccountSession(): Promise<AccountSession | null> {
  return readStoredSession();
}

export async function signInWithGoogle(): Promise<AccountSession | null> {
  const environment = requireAuthEnvironment();
  const discovery = await getDiscovery(environment);
  const request = new AuthSession.AuthRequest({
    clientId: environment.clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: authScopes,
    usePKCE: true,
    extraParams: { identity_provider: 'Google' },
  });
  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss') return null;
  if (result.type !== 'success' || !result.params.code || !request.codeVerifier) {
    throw new Error('Google sign-in did not complete.');
  }
  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId: environment.clientId,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier },
    },
    discovery,
  );
  return createSession(token, discovery);
}

export async function getValidAccountSession(): Promise<AccountSession | null> {
  const stored = await readStoredSession();
  if (!stored || stored.expiresAt > Date.now() + 60_000) return stored;

  const environment = requireAuthEnvironment();
  const discovery = await getDiscovery(environment);
  const token = await AuthSession.refreshAsync(
    { clientId: environment.clientId, refreshToken: stored.refreshToken },
    discovery,
  );
  return createSession(token, discovery, stored.refreshToken);
}

export async function signOutAccount(): Promise<void> {
  const stored = await readStoredSession();
  await SecureStore.deleteItemAsync(sessionKey, secureStoreOptions);
  if (!stored) return;

  try {
    const environment = requireAuthEnvironment();
    const discovery = await getDiscovery(environment);
    if (!discovery.revocationEndpoint) return;
    await AuthSession.revokeAsync(
      {
        clientId: environment.clientId,
        token: stored.refreshToken,
        tokenTypeHint: AuthSession.TokenTypeHint.RefreshToken,
      },
      discovery,
    );
  } catch {
    // Local sign-out must still succeed when the provider is offline.
  }
}
