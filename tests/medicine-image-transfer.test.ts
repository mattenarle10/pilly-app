import { requestCloudApi } from '@/services/cloud-sync-api';
import {
  deleteRemoteMedicinePhoto,
  downloadMedicinePhoto,
  reconcileMedicinePhotoTransfers,
  retryMedicinePhotoTransfer,
  uploadMedicinePhoto,
} from '@/services/medicine-image-transfer';
import type { PillyRepository } from '@/storage/repository';
import { downloadMedicinePhotoToCache, medicinePhotoUri } from '@/services/medicine-image-cache';

const mockUpload = jest.fn();

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ upload: mockUpload })),
  UploadType: { BINARY_CONTENT: 0 },
}));
jest.mock('@/services/cloud-sync-api', () => ({ requestCloudApi: jest.fn() }));
jest.mock('@/services/medicine-image-cache', () => ({
  downloadMedicinePhotoToCache: jest.fn(),
  medicinePhotoUri: jest.fn(),
}));

const mockedRequest = jest.mocked(requestCloudApi);
const mockedMedicinePhotoUri = jest.mocked(medicinePhotoUri);
const mockedDownloadToCache = jest.mocked(downloadMedicinePhotoToCache);

const medicationId = '6a85182a-a5b4-4528-b124-289c50fd95fd';
const imageId = '18d87dc4-890f-434a-bff2-30c21e9463d8';
const sha256 = 'a'.repeat(64);
const image = {
  medicationId,
  imageId,
  cacheKey: `accounts/account/medicines/${medicationId}/${imageId}.jpg`,
  sha256,
  byteCount: 123,
  width: 640,
  height: 480,
  remoteVersion: null,
  transferState: 'pendingUpload' as const,
  updatedAt: '2026-09-01T00:00:00.000Z',
  lastError: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('uploads the exact normalized JPEG before completing its stable metadata', async () => {
  mockedMedicinePhotoUri.mockReturnValue('file:///private/photo.jpg');
  mockedRequest
    .mockResolvedValueOnce({
      uploadUrl: 'https://upload.example/photo',
      expiresAt: '2026-09-01T00:05:00.000Z',
      headers: { 'content-type': 'image/jpeg', 'x-amz-checksum-sha256': 'checksum' },
    })
    .mockResolvedValueOnce({ remoteVersion: 'version-1' });
  mockUpload.mockResolvedValue({ status: 200, body: '', headers: {} });

  await expect(uploadMedicinePhoto(image)).resolves.toBe('version-1');
  expect(mockUpload).toHaveBeenCalledWith(
    'https://upload.example/photo',
    expect.objectContaining({
      httpMethod: 'PUT',
      uploadType: 0,
      mimeType: 'image/jpeg',
      sessionType: 'foreground',
    }),
  );
  expect(mockedRequest).toHaveBeenNthCalledWith(
    2,
    '/v1/images/complete',
    expect.objectContaining({ method: 'POST' }),
  );
});

test('does not complete a rejected object upload', async () => {
  mockedMedicinePhotoUri.mockReturnValue('file:///private/photo.jpg');
  mockedRequest.mockResolvedValueOnce({
    uploadUrl: 'https://upload.example/photo',
    expiresAt: '2026-09-01T00:05:00.000Z',
    headers: {},
  });
  mockUpload.mockResolvedValue({ status: 403, body: '', headers: {} });

  await expect(uploadMedicinePhoto(image)).rejects.toThrow('could not be uploaded');
  expect(mockedRequest).toHaveBeenCalledTimes(1);
});

test('downloads owner-authorized metadata into the account cache', async () => {
  mockedRequest.mockResolvedValue({
    downloadUrl: 'https://download.example/photo',
    expiresAt: '2026-09-01T00:05:00.000Z',
    imageId,
    sha256,
    byteCount: 123,
    width: 640,
    height: 480,
    remoteVersion: 'version-1',
  });
  mockedDownloadToCache.mockResolvedValue({
    cacheKey: image.cacheKey,
    uri: 'file:///private/photo.jpg',
  });

  await expect(downloadMedicinePhoto({ accountId: 'account-1', medicationId })).resolves.toEqual(
    expect.objectContaining({ medicationId, imageId, transferState: 'uploaded' }),
  );
  expect(mockedDownloadToCache).toHaveBeenCalledWith(
    expect.objectContaining({ accountId: 'account-1', medicationId, sha256 }),
  );
});

test('deletes only the encoded medicine image route', async () => {
  mockedRequest.mockResolvedValue(undefined);
  await deleteRemoteMedicinePhoto(medicationId);
  expect(mockedRequest).toHaveBeenCalledWith(`/v1/images/${medicationId}`, { method: 'DELETE' });
});

test('retries a pending deletion even when upload completion never returned a version', async () => {
  const repository = {
    removeMedicationImage: jest.fn().mockResolvedValue(image),
    updateMedicationImageTransfer: jest.fn(),
  } as unknown as PillyRepository;
  mockedRequest.mockResolvedValue(undefined);

  await expect(
    retryMedicinePhotoTransfer(repository, { ...image, transferState: 'pendingDelete' }),
  ).resolves.toBeNull();

  expect(mockedRequest).toHaveBeenCalledWith(`/v1/images/${medicationId}`, { method: 'DELETE' });
  expect(repository.removeMedicationImage).toHaveBeenCalledWith(medicationId);
});

test('reconciles durable failed uploads after a later app launch', async () => {
  const repository = {
    listMedicationImages: jest.fn().mockResolvedValue([{ ...image, transferState: 'failed' }]),
    updateMedicationImageTransfer: jest.fn().mockResolvedValue(undefined),
  } as unknown as PillyRepository;
  mockedMedicinePhotoUri.mockReturnValue('file:///private/photo.jpg');
  mockedRequest
    .mockResolvedValueOnce({
      uploadUrl: 'https://upload.example/photo',
      expiresAt: '2026-09-01T00:05:00.000Z',
      headers: {},
    })
    .mockResolvedValueOnce({ remoteVersion: 'version-2' });
  mockUpload.mockResolvedValue({ status: 200, body: '', headers: {} });

  await expect(reconcileMedicinePhotoTransfers(repository)).resolves.toEqual([medicationId]);
  expect(repository.updateMedicationImageTransfer).toHaveBeenCalledWith({
    medicationId,
    state: 'uploaded',
    remoteVersion: 'version-2',
  });
});
