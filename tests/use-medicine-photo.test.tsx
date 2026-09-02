import type { PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAccountSession } from '@/hooks/use-account-session';
import { useMedicinePhoto } from '@/hooks/use-medicine-photo';
import { usePlus } from '@/hooks/use-plus';
import { useRepository } from '@/hooks/use-repository';
import type { MedicationImage } from '@/models/medication-image';
import { CloudSyncApiError } from '@/services/cloud-sync-api';
import {
  attachStagedMedicinePhoto,
  medicinePhotoUri,
  selectMedicinePhoto,
} from '@/services/medicine-image-cache';
import {
  downloadMedicinePhoto,
  retryMedicinePhotoTransfer,
  uploadMedicinePhoto,
} from '@/services/medicine-image-transfer';
import type { PillyRepository } from '@/storage/repository';

jest.mock('@/hooks/use-account-session', () => ({ useAccountSession: jest.fn() }));
jest.mock('@/hooks/use-plus', () => ({ usePlus: jest.fn() }));
jest.mock('@/hooks/use-repository', () => ({ useRepository: jest.fn() }));
jest.mock('@/services/cloud-sync-api', () => ({
  CloudSyncApiError: class CloudSyncApiError extends Error {
    status: number | null;

    constructor(_code: string, message: string, status: number | null = null) {
      super(message);
      this.status = status;
    }
  },
}));
jest.mock('@/services/medicine-image-cache');
jest.mock('@/services/medicine-image-transfer');

const mockedAccount = jest.mocked(useAccountSession);
const mockedPlus = jest.mocked(usePlus);
const mockedRepository = jest.mocked(useRepository);
const mockedAttach = jest.mocked(attachStagedMedicinePhoto);
const mockedPhotoUri = jest.mocked(medicinePhotoUri);
const mockedSelect = jest.mocked(selectMedicinePhoto);
const mockedDownload = jest.mocked(downloadMedicinePhoto);
const mockedRetry = jest.mocked(retryMedicinePhotoTransfer);
const mockedUpload = jest.mocked(uploadMedicinePhoto);

const staged = {
  imageId: '9b7e191d-18ef-4c44-8129-786a6b072f36',
  cacheKey: 'staging/9b7e191d-18ef-4c44-8129-786a6b072f36.jpg',
  sha256: 'a'.repeat(64),
  byteCount: 80_000,
  width: 768,
  height: 1_024,
};

const pending: MedicationImage = {
  ...staged,
  medicationId: 'medicine-1',
  cacheKey: 'account-1/medicine-1/9b7e191d-18ef-4c44-8129-786a6b072f36.jpg',
  remoteVersion: null,
  transferState: 'pendingUpload',
  updatedAt: '2026-09-02T08:16:30.603Z',
  lastError: null,
};

function setup() {
  let stored: MedicationImage | null = null;
  const repository = {
    getMedicationImage: jest.fn(async () => stored),
    saveMedicationImage: jest.fn(async (image: MedicationImage) => {
      stored = image;
    }),
    updateMedicationImageTransfer: jest.fn(
      async (input: {
        state: MedicationImage['transferState'];
        remoteVersion?: string | null;
        lastError?: string | null;
      }) => {
        if (!stored) return;
        stored = {
          ...stored,
          transferState: input.state,
          remoteVersion: input.remoteVersion ?? stored.remoteVersion,
          lastError: input.lastError ?? null,
        };
      },
    ),
  };
  mockedRepository.mockReturnValue(repository as unknown as PillyRepository);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, hook: renderHook(() => useMedicinePhoto('medicine-1'), { wrapper }) };
}

describe('useMedicinePhoto', () => {
  beforeEach(() => {
    mockedAccount.mockReturnValue({
      state: {
        kind: 'signed-in',
        user: {
          id: 'account-1',
          email: 'matt@example.com',
          displayName: 'Matthew',
          provider: 'google',
        },
      },
    } as ReturnType<typeof useAccountSession>);
    mockedPlus.mockReturnValue({
      state: { kind: 'active', active: true, canRestore: true, offline: false },
    } as ReturnType<typeof usePlus>);
    mockedPhotoUri.mockReturnValue('file:///private/photo.jpg');
    mockedDownload.mockRejectedValue(new CloudSyncApiError('network', 'Not found', 404));
    mockedSelect.mockResolvedValue({
      kind: 'selected',
      image: staged,
      uri: 'file:///private/photo.jpg',
    });
    mockedAttach.mockResolvedValue(pending);
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  test('clears a failed selection upload after its retry succeeds', async () => {
    mockedUpload.mockRejectedValueOnce(new Error('Network unavailable'));
    mockedRetry.mockResolvedValueOnce({
      ...pending,
      transferState: 'uploaded',
      remoteVersion: 'version-1',
      lastError: null,
    });
    const { queryClient, hook } = setup();
    const { result } = await hook;

    await waitFor(() => expect(result.current.image).toBeNull());
    await act(async () => {
      await result.current.select('library').catch(() => undefined);
    });
    await waitFor(() => expect(result.current.errorKind).toBe('transfer'));

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => expect(result.current.image?.transferState).toBe('uploaded'));
    expect(result.current.error).toBeNull();
    expect(result.current.errorKind).toBeNull();
    queryClient.clear();
  });
});
