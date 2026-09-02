import { File, UploadType } from 'expo-file-system';
import { z } from 'zod';

import { preparedProfileAvatarSchema, type PreparedProfileAvatar } from '@/models/profile-avatar';

import { requestCloudApi } from './cloud-sync-api';
import { downloadProfileAvatarToCache } from './profile-avatar-cache';

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
  byteCount: z.number().int().positive().max(524_288),
  width: z.number().int().positive().max(512),
  height: z.number().int().positive().max(512),
  remoteVersion: z.string().min(1),
});

export async function uploadProfileAvatar(avatar: PreparedProfileAvatar): Promise<string> {
  const parsed = preparedProfileAvatarSchema.parse(avatar);
  const payload = {
    imageId: parsed.imageId,
    sha256: parsed.sha256,
    byteCount: parsed.byteCount,
    width: parsed.width,
    height: parsed.height,
  };
  const upload = uploadResponseSchema.parse(
    await requestCloudApi('/v1/avatar/upload-url', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const result = await new File(parsed.uri).upload(upload.uploadUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    mimeType: 'image/jpeg',
    headers: upload.headers,
    sessionType: 'foreground',
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error('The profile photo could not be uploaded.');
  }
  const complete = completeResponseSchema.parse(
    await requestCloudApi('/v1/avatar/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  return complete.remoteVersion;
}

export async function downloadProfileAvatar(accountId: string): Promise<string> {
  const response = downloadResponseSchema.parse(await requestCloudApi('/v1/avatar/download-url'));
  return downloadProfileAvatarToCache({
    accountId,
    url: response.downloadUrl,
    sha256: response.sha256,
    byteCount: response.byteCount,
  });
}

export async function deleteRemoteProfileAvatar(): Promise<void> {
  await requestCloudApi('/v1/avatar', { method: 'DELETE' });
}
