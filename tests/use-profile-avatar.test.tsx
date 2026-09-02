import type { PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus } from '@/hooks/use-plus';
import { useProfileAvatar } from '@/hooks/use-profile-avatar';
import {
  cachedProfileAvatarUri,
  selectProfileAvatar,
  storeProfileAvatar,
} from '@/services/profile-avatar-cache';
import { downloadProfileAvatar, uploadProfileAvatar } from '@/services/profile-avatar-transfer';

jest.mock('@/hooks/use-account-session', () => ({ useAccountSession: jest.fn() }));
jest.mock('@/hooks/use-plus', () => ({ usePlus: jest.fn() }));
jest.mock('@/services/cloud-sync-api', () => ({
  CloudSyncApiError: class CloudSyncApiError extends Error {
    code: string;
    status: number | null;

    constructor(errorCode: string, message: string, status: number | null = null) {
      super(message);
      this.code = errorCode;
      this.status = status;
    }
  },
}));
jest.mock('@/services/profile-avatar-cache');
jest.mock('@/services/profile-avatar-transfer');

const mockedAccount = jest.mocked(useAccountSession);
const mockedPlus = jest.mocked(usePlus);
const mockedCachedUri = jest.mocked(cachedProfileAvatarUri);
const mockedSelect = jest.mocked(selectProfileAvatar);
const mockedStore = jest.mocked(storeProfileAvatar);
const mockedDownload = jest.mocked(downloadProfileAvatar);
const mockedUpload = jest.mocked(uploadProfileAvatar);
const prepared = {
  imageId: '9b7e191d-18ef-4c44-8129-786a6b072f36',
  uri: 'file:///staged-avatar.jpg',
  sha256: 'a'.repeat(64),
  byteCount: 80_000,
  width: 512,
  height: 512,
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, hook: renderHook(() => useProfileAvatar(), { wrapper }) };
}

describe('useProfileAvatar', () => {
  beforeEach(() => {
    mockedAccount.mockReturnValue({
      state: {
        kind: 'signed-in',
        user: {
          id: 'account-1',
          email: 'matt@example.com',
          displayName: 'Matthew',
          provider: 'apple',
        },
      },
    } as ReturnType<typeof useAccountSession>);
    mockedPlus.mockReturnValue({
      state: { kind: 'active', active: true, canRestore: true, offline: false },
    } as ReturnType<typeof usePlus>);
    mockedCachedUri.mockResolvedValue(null);
    mockedDownload.mockResolvedValue('file:///remote-avatar.jpg');
    mockedUpload.mockResolvedValue('version-1');
    mockedStore.mockResolvedValue('file:///account-avatar.jpg');
    mockedSelect.mockResolvedValue({ kind: 'selected', avatar: prepared });
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('restores an existing owner avatar even when Plus is no longer active', async () => {
    mockedPlus.mockReturnValue({
      state: {
        kind: 'available',
        active: false,
        canRestore: true,
        offers: { monthly: null, annual: null },
      },
    } as unknown as ReturnType<typeof usePlus>);
    const { queryClient, hook } = setup();
    const { result } = await hook;

    await waitFor(() => expect(result.current.uri).toBe('file:///remote-avatar.jpg'));
    expect(result.current.canUpload).toBe(false);
    expect(mockedDownload).toHaveBeenCalledWith('account-1');
    queryClient.clear();
  });

  test('prepares, uploads, and adopts an avatar only for active Plus', async () => {
    const { queryClient, hook } = setup();
    const { result } = await hook;

    await waitFor(() => expect(result.current.uri).toBe('file:///remote-avatar.jpg'));
    await act(async () => {
      await result.current.select('camera');
    });

    expect(mockedSelect).toHaveBeenCalledWith('camera');
    expect(mockedUpload).toHaveBeenCalledWith(prepared);
    expect(mockedStore).toHaveBeenCalledWith('account-1', prepared.uri);
    await waitFor(() => expect(result.current.uri).toBe('file:///account-avatar.jpg'));
    queryClient.clear();
  });

  test('does not open a picker when Plus is inactive', async () => {
    mockedPlus.mockReturnValue({
      state: {
        kind: 'available',
        active: false,
        canRestore: true,
        offers: { monthly: null, annual: null },
      },
    } as unknown as ReturnType<typeof usePlus>);
    const { queryClient, hook } = setup();
    const { result } = await hook;

    await expect(result.current.select('library')).rejects.toThrow('Pilly Plus is required');
    expect(mockedSelect).not.toHaveBeenCalled();
    queryClient.clear();
  });
});
