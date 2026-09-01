import { z } from 'zod';

import {
  bootstrapResponseSchema,
  syncMutationSchema,
  syncResponseSchema,
  type BootstrapResponse,
  type SyncMutation,
  type SyncResponse,
} from '@/models/sync';

import { getValidAccountSession } from './account-session';

const apiEnvironmentSchema = z.object({
  baseUrl: z.url().transform((value) => value.replace(/\/$/, '')),
});

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});

const syncRequestSchema = z.object({
  schemaVersion: z.literal(1),
  deviceId: z.uuid(),
  cursor: z.number().int().nonnegative().nullable(),
  mutations: z.array(syncMutationSchema).max(25),
});

export type CloudSyncErrorCode =
  'not-configured' | 'unauthorized' | 'plus-required' | 'conflict' | 'network' | 'server';

export class CloudSyncApiError extends Error {
  constructor(
    readonly code: CloudSyncErrorCode,
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'CloudSyncApiError';
  }
}

function readEnvironment(): z.infer<typeof apiEnvironmentSchema> | null {
  const baseUrl = process.env.EXPO_PUBLIC_PILLY_API_URL;
  if (!baseUrl) return null;
  return apiEnvironmentSchema.parse({ baseUrl });
}

export function isCloudSyncConfigured(): boolean {
  return readEnvironment() !== null;
}

export async function requestCloudApi(path: string, init?: RequestInit): Promise<unknown> {
  const environment = readEnvironment();
  if (!environment) {
    throw new CloudSyncApiError('not-configured', 'Cloud backup is not configured in this build.');
  }
  const session = await getValidAccountSession();
  if (!session) throw new CloudSyncApiError('unauthorized', 'Sign in to continue.', 401);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${environment.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (response.ok) return body;
    const apiError = apiErrorSchema.safeParse(body);
    const message = apiError.success ? apiError.data.error.message : 'Cloud backup is unavailable.';
    const code =
      response.status === 401
        ? 'unauthorized'
        : response.status === 403
          ? 'plus-required'
          : response.status === 409
            ? 'conflict'
            : response.status >= 500
              ? 'server'
              : 'network';
    throw new CloudSyncApiError(code, message, response.status);
  } catch (error) {
    if (error instanceof CloudSyncApiError) throw error;
    throw new CloudSyncApiError(
      'network',
      error instanceof Error && error.name === 'AbortError'
        ? 'Cloud backup timed out.'
        : 'Check your connection and try again.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCloudBootstrap(): Promise<BootstrapResponse> {
  return bootstrapResponseSchema.parse(await requestCloudApi('/v1/bootstrap'));
}

export async function pushCloudMutations(input: {
  deviceId: string;
  cursor: number | null;
  mutations: SyncMutation[];
}): Promise<SyncResponse> {
  const body = syncRequestSchema.parse({ schemaVersion: 1, ...input });
  return syncResponseSchema.parse(
    await requestCloudApi('/v1/sync', { method: 'POST', body: JSON.stringify(body) }),
  );
}
