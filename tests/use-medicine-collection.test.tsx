import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import {
  useMedicineCollectionPhotos,
  useMedicineCollectionPreferences,
} from '@/hooks/use-medicine-collection';
import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus } from '@/hooks/use-plus';
import { useRepository } from '@/hooks/use-repository';

jest.mock('@/hooks/use-account-session', () => ({
  useAccountSession: jest.fn(),
}));
jest.mock('@/hooks/use-plus', () => ({
  usePlus: jest.fn(),
}));
jest.mock('@/hooks/use-repository', () => ({
  useRepository: jest.fn(),
}));
jest.mock('@/services/medicine-image-cache', () => ({
  medicinePhotoUri: (cacheKey: string) => `file:///${cacheKey}`,
}));

const mockedUseAccountSession = jest.mocked(useAccountSession);
const mockedUsePlus = jest.mocked(usePlus);
const mockedUseRepository = jest.mocked(useRepository);

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('medicine collection hooks', () => {
  beforeEach(() => {
    mockedUseAccountSession.mockReturnValue({
      state: { kind: 'signed-out' },
    } as unknown as ReturnType<typeof useAccountSession>);
    mockedUsePlus.mockReturnValue({
      state: { kind: 'ready', active: false },
    } as unknown as ReturnType<typeof usePlus>);
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('loads and saves free local collection preferences', async () => {
    const repository = {
      getSetting: jest.fn((key: string) => Promise.resolve(key.endsWith('View') ? 'list' : 'recent')),
      setSetting: jest.fn().mockResolvedValue(undefined),
    };
    mockedUseRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useRepository>,
    );
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false, gcTime: 0 },
      },
    });
    const { result } = await renderHook(() => useMedicineCollectionPreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.view).toBe('list'));
    expect(result.current.sort).toBe('recent');

    await act(async () => result.current.setView('cabinet'));
    await waitFor(() =>
      expect(repository.setSetting).toHaveBeenCalledWith('medicineCollectionView', 'cabinet'),
    );
    client.clear();
  });

  test('only exposes cached medicine photos for active Plus', async () => {
    const repository = {
      listMedicationImages: jest.fn().mockResolvedValue([
        { medicationId: 'one', cacheKey: 'medicines/one.jpg', transferState: 'uploaded' },
        { medicationId: 'two', cacheKey: 'medicines/two.jpg', transferState: 'pendingDelete' },
      ]),
    };
    mockedUseRepository.mockReturnValue(
      repository as unknown as ReturnType<typeof useRepository>,
    );
    mockedUseAccountSession.mockReturnValue({
      state: { kind: 'signed-in', user: { id: 'account' } },
    } as unknown as ReturnType<typeof useAccountSession>);
    mockedUsePlus.mockReturnValue({
      state: { kind: 'ready', active: true },
    } as unknown as ReturnType<typeof usePlus>);
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false, gcTime: 0 },
      },
    });
    const { result } = await renderHook(() => useMedicineCollectionPhotos(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.photoUris.one).toBe('file:///medicines/one.jpg'));
    expect(result.current.photoUris.two).toBeUndefined();
    client.clear();
  });
});
