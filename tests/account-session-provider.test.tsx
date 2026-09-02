import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAccountSession } from '@/hooks/use-account-session';
import { AccountSessionProvider } from '@/providers/account-session-provider';
import { deleteCloudAccount } from '@/services/cloud-sync-api';
import {
  restoreAccountSession,
  signInWithProvider,
  signOutAccount,
} from '@/services/account-session';
import {
  deleteCachedMedicinePhoto,
  purgeMedicinePhotoCacheForAccount,
} from '@/services/medicine-image-cache';

const mockClearMedicationImages = jest.fn();
const mockClearTrackedData = jest.fn();
const mockDeleteSetting = jest.fn();
const mockClearAccount = jest.fn();

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));
jest.mock('@/services/account-session', () => ({
  isAccountSignInConfigured: () => true,
  restoreAccountSession: jest.fn(),
  signInWithProvider: jest.fn(),
  signOutAccount: jest.fn(),
}));
jest.mock('@/services/cloud-sync-api', () => ({ deleteCloudAccount: jest.fn() }));
jest.mock('@/services/medicine-image-cache', () => ({
  deleteCachedMedicinePhoto: jest.fn(),
  purgeMedicinePhotoCacheForAccount: jest.fn(),
}));
jest.mock('@/services/notifications', () => ({ reconcileLocalReminders: jest.fn() }));
jest.mock('@/storage/repository', () => ({
  PillyRepository: jest.fn().mockImplementation(() => ({
    clearMedicationImages: mockClearMedicationImages,
    clearTrackedData: mockClearTrackedData,
    deleteSetting: mockDeleteSetting,
  })),
}));
jest.mock('@/storage/sync-store', () => ({
  PillySyncStore: jest.fn().mockImplementation(() => ({ clearAccount: mockClearAccount })),
}));

const mockedDeleteCloudAccount = jest.mocked(deleteCloudAccount);
const mockedRestoreAccountSession = jest.mocked(restoreAccountSession);
const mockedSignInWithProvider = jest.mocked(signInWithProvider);
const mockedSignOutAccount = jest.mocked(signOutAccount);
const mockedDeleteCachedMedicinePhoto = jest.mocked(deleteCachedMedicinePhoto);
const mockedPurgeMedicinePhotoCacheForAccount = jest.mocked(purgeMedicinePhotoCacheForAccount);

const session = {
  user: {
    id: 'account-1',
    email: 'matt@example.com',
    displayName: 'Matthew',
    provider: 'apple' as const,
  },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 60_000,
};

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <AccountSessionProvider>{children}</AccountSessionProvider>
    </QueryClientProvider>
  );
}

describe('account session provider', () => {
  beforeEach(() => {
    mockedRestoreAccountSession.mockResolvedValue(session);
    mockedSignInWithProvider.mockResolvedValue(session);
    mockedSignOutAccount.mockResolvedValue(undefined);
    mockedDeleteCloudAccount.mockResolvedValue(undefined);
    mockClearMedicationImages.mockResolvedValue([
      { cacheKey: 'accounts/account-1/medicines/medicine-1/image-1.jpg' },
    ]);
    mockClearTrackedData.mockResolvedValue([
      { cacheKey: 'accounts/account-1/medicines/medicine-1/image-1.jpg' },
    ]);
    mockDeleteSetting.mockResolvedValue(undefined);
    mockedPurgeMedicinePhotoCacheForAccount.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('keeps the account connected when server deletion fails', async () => {
    mockedDeleteCloudAccount.mockRejectedValueOnce(new Error('offline'));
    const { result } = await renderHook(() => useAccountSession(), { wrapper });
    await waitFor(() => expect(result.current.state.kind).toBe('signed-in'));

    await act(async () => {
      await expect(result.current.deleteAccount()).resolves.toBe(false);
    });

    expect(result.current.state.kind).toBe('signed-in');
    expect(result.current.error).toBe('delete');
    expect(mockedSignOutAccount).not.toHaveBeenCalled();
    expect(mockClearAccount).not.toHaveBeenCalled();
  });

  test('returns to local mode and clears only account-bound state after deletion', async () => {
    const { result } = await renderHook(() => useAccountSession(), { wrapper });
    await waitFor(() => expect(result.current.state.kind).toBe('signed-in'));

    await act(async () => {
      await expect(result.current.deleteAccount()).resolves.toBe(true);
    });

    expect(result.current.state).toEqual({ kind: 'local', user: null });
    expect(mockedSignOutAccount).toHaveBeenCalledTimes(1);
    expect(mockClearAccount).toHaveBeenCalledWith('account-1');
    expect(mockDeleteSetting).toHaveBeenCalledWith('plusEntitled:account-1');
    expect(mockedDeleteCachedMedicinePhoto).toHaveBeenCalledWith(
      'accounts/account-1/medicines/medicine-1/image-1.jpg',
    );
    expect(mockedPurgeMedicinePhotoCacheForAccount).toHaveBeenCalledWith('account-1');
    expect(mockClearTrackedData).not.toHaveBeenCalled();
  });

  test('removes the signed-in account dataset before completing sign out', async () => {
    const { result } = await renderHook(() => useAccountSession(), { wrapper });
    await waitFor(() => expect(result.current.state.kind).toBe('signed-in'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockClearTrackedData).toHaveBeenCalledTimes(1);
    expect(mockedSignOutAccount).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({ kind: 'local', user: null });
    expect(mockClearAccount).not.toHaveBeenCalled();
  });

  test('keeps the account screen active when local privacy cleanup fails', async () => {
    mockClearTrackedData.mockRejectedValueOnce(new Error('database busy'));
    const { result } = await renderHook(() => useAccountSession(), { wrapper });
    await waitFor(() => expect(result.current.state.kind).toBe('signed-in'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockedSignOutAccount).not.toHaveBeenCalled();
    expect(result.current.state.kind).toBe('signed-in');
    expect(result.current.error).toBe('sign-out');
  });
});
