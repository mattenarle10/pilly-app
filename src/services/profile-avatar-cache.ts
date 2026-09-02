import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { preparedProfileAvatarSchema, type PreparedProfileAvatar } from '@/models/profile-avatar';

import { sha256Hex } from './file-digest';
import { containsSensitiveJpegMetadata, sanitizeJpegMetadata } from './medicine-image-cache';
import { asPhotoPreparationError, PhotoPreparationError } from './photo-preparation-error';

const maxBytes = 524_288;
const maxEdge = 512;
const compressionAttempts = [0.86, 0.72, 0.58] as const;
const avatarRoot = new Directory(Paths.document, 'profile-avatars');
const stagingRoot = new Directory(Paths.cache, 'profile-avatar-staging');

export type ProfileAvatarSource = 'camera' | 'library';
export type ProfileAvatarSelection =
  | { kind: 'selected'; avatar: PreparedProfileAvatar }
  | { kind: 'cancelled' }
  | { kind: 'permission-denied'; canAskAgain: boolean }
  | { kind: 'unavailable' };

async function accountNamespace(accountId: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, accountId);
}

async function avatarFile(accountId: string): Promise<File> {
  return new File(avatarRoot, await accountNamespace(accountId), 'avatar.jpg');
}

async function normalizeAvatar(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PreparedProfileAvatar> {
  if (!asset.width || !asset.height) {
    throw new PhotoPreparationError('This photo couldn’t be read. Choose another and try again.');
  }
  stagingRoot.create({ intermediates: true, idempotent: true });
  const imageId = Crypto.randomUUID();
  const side = Math.min(asset.width, asset.height);
  const outputEdge = Math.min(side, maxEdge);

  for (const compress of compressionAttempts) {
    const context = ImageManipulator.manipulate(asset.uri);
    context.crop({
      originX: Math.floor((asset.width - side) / 2),
      originY: Math.floor((asset.height - side) / 2),
      width: side,
      height: side,
    });
    if (side !== outputEdge) context.resize({ width: outputEdge, height: outputEdge });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ compress, format: SaveFormat.JPEG });
    const temporary = new File(result.uri);
    try {
      const bytes = sanitizeJpegMetadata(await temporary.bytes());
      if (bytes.byteLength > maxBytes) continue;
      const digest = await sha256Hex(bytes);
      const destination = new File(stagingRoot, `${imageId}.jpg`);
      destination.create({ overwrite: true });
      destination.write(bytes);
      return preparedProfileAvatarSchema.parse({
        imageId,
        uri: destination.uri,
        sha256: digest,
        byteCount: bytes.byteLength,
        width: result.width,
        height: result.height,
      });
    } finally {
      if (temporary.exists) temporary.delete();
    }
  }
  throw new PhotoPreparationError('Choose a smaller photo and try again.');
}

export async function selectProfileAvatar(
  source: ProfileAvatarSource,
): Promise<ProfileAvatarSelection> {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { kind: 'permission-denied', canAskAgain: permission.canAskAgain };
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      allowsMultipleSelection: false,
      quality: 1,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return { kind: 'cancelled' };
    return { kind: 'selected', avatar: await normalizeAvatar(result.assets[0]) };
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
    if (code === 'ERR_MISSING_PERMISSION') {
      return { kind: 'permission-denied', canAskAgain: false };
    }
    if (code === 'ERR_CAMERA_UNAVAILABLE') return { kind: 'unavailable' };
    throw asPhotoPreparationError(error);
  }
}

export async function storeProfileAvatar(accountId: string, sourceUri: string): Promise<string> {
  const source = new File(sourceUri);
  if (!source.exists) throw new Error('The prepared profile photo is no longer available.');
  const destination = await avatarFile(accountId);
  destination.parentDirectory.create({ intermediates: true, idempotent: true });
  await source.move(destination, { overwrite: true });
  return destination.uri;
}

export async function cachedProfileAvatarUri(accountId: string): Promise<string | null> {
  const file = await avatarFile(accountId);
  return file.exists ? file.uri : null;
}

export async function downloadProfileAvatarToCache(input: {
  accountId: string;
  url: string;
  sha256: string;
  byteCount: number;
}): Promise<string> {
  const destination = await avatarFile(input.accountId);
  destination.parentDirectory.create({ intermediates: true, idempotent: true });
  try {
    await File.downloadFileAsync(input.url, destination, { idempotent: true });
    const bytes = await destination.bytes();
    if (bytes.byteLength !== input.byteCount || bytes.byteLength > maxBytes) {
      throw new Error('The downloaded profile photo has an unexpected size.');
    }
    if (containsSensitiveJpegMetadata(bytes)) {
      throw new Error('The downloaded profile photo is not a safe JPEG.');
    }
    const digest = await sha256Hex(bytes);
    if (digest !== input.sha256) {
      throw new Error('The downloaded profile photo failed its integrity check.');
    }
    return destination.uri;
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
}

export async function purgeProfileAvatarCacheForAccount(accountId: string): Promise<void> {
  const directory = new Directory(avatarRoot, await accountNamespace(accountId));
  if (directory.exists) directory.delete();
}

export function deletePreparedProfileAvatar(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}
