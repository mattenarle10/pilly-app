import { File, UploadType } from 'expo-file-system';
import { z } from 'zod';

import { medicationImageSchema, type MedicationImage } from '@/models/medication-image';

import { requestCloudApi } from './cloud-sync-api';
import { downloadMedicinePhotoToCache, medicinePhotoUri } from './medicine-image-cache';

const imageTransferPayloadSchema = medicationImageSchema.pick({
  medicationId: true,
  imageId: true,
  sha256: true,
  byteCount: true,
  width: true,
  height: true,
});

const uploadResponseSchema = z.object({
  uploadUrl: z.url(),
  expiresAt: z.iso.datetime(),
  headers: z.record(z.string(), z.string()),
});

const completeResponseSchema = z.object({ remoteVersion: z.string().min(1) });

const downloadResponseSchema = z.object({
  downloadUrl: z.url(),
  expiresAt: z.iso.datetime(),
  imageId: z.uuid(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  byteCount: z.number().int().positive().max(1_048_576),
  width: z.number().int().positive().max(1_024),
  height: z.number().int().positive().max(1_024),
  remoteVersion: z.string().min(1),
});

export async function uploadMedicinePhoto(image: MedicationImage): Promise<string> {
  const parsed = medicationImageSchema.parse(image);
  const uri = medicinePhotoUri(parsed.cacheKey);
  if (!uri) throw new Error('The medicine photo is no longer available on this device.');
  const payload = imageTransferPayloadSchema.parse(parsed);
  const upload = uploadResponseSchema.parse(
    await requestCloudApi('/v1/images/upload-url', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const result = await new File(uri).upload(upload.uploadUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    mimeType: 'image/jpeg',
    headers: upload.headers,
    sessionType: 'foreground',
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error('The medicine photo could not be uploaded.');
  }

  const complete = completeResponseSchema.parse(
    await requestCloudApi('/v1/images/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  return complete.remoteVersion;
}

export async function downloadMedicinePhoto(input: {
  accountId: string;
  medicationId: string;
}): Promise<MedicationImage> {
  const response = downloadResponseSchema.parse(
    await requestCloudApi('/v1/images/download-url', {
      method: 'POST',
      body: JSON.stringify({ medicationId: input.medicationId }),
    }),
  );
  const cached = await downloadMedicinePhotoToCache({
    accountId: input.accountId,
    medicationId: input.medicationId,
    imageId: response.imageId,
    url: response.downloadUrl,
    sha256: response.sha256,
    byteCount: response.byteCount,
  });
  return medicationImageSchema.parse({
    medicationId: input.medicationId,
    imageId: response.imageId,
    cacheKey: cached.cacheKey,
    sha256: response.sha256,
    byteCount: response.byteCount,
    width: response.width,
    height: response.height,
    remoteVersion: response.remoteVersion,
    transferState: 'uploaded',
    updatedAt: new Date().toISOString(),
    lastError: null,
  });
}

export async function deleteRemoteMedicinePhoto(medicationId: string): Promise<void> {
  await requestCloudApi(`/v1/images/${encodeURIComponent(medicationId)}`, { method: 'DELETE' });
}
