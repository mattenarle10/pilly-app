import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat, type Action } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import {
  medicationImageSchema,
  stagedMedicationImageSchema,
  type MedicationImage,
  type StagedMedicationImage,
} from '@/models/medication-image';

import { sha256Hex } from './file-digest';
import { asPhotoPreparationError, PhotoPreparationError } from './photo-preparation-error';

const maxEdge = 1_024;
const maxBytes = 1_048_576;
const compressionAttempts = [0.82, 0.68, 0.54] as const;
const imageRoot = new Directory(Paths.document, 'medicine-images');

export type MedicinePhotoSelection =
  | { kind: 'selected'; image: StagedMedicationImage; uri: string }
  | { kind: 'cancelled' }
  | { kind: 'permission-denied'; canAskAgain: boolean }
  | { kind: 'unavailable' };

export type MedicinePhotoSource = 'camera' | 'library';

export function resizeAction(width: number, height: number): Action[] {
  if (width <= maxEdge && height <= maxEdge) return [];
  return width >= height ? [{ resize: { width: maxEdge } }] : [{ resize: { height: maxEdge } }];
}

export function containsSensitiveJpegMetadata(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return true;
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return true;
    const marker = bytes[offset + 1]!;
    if (marker === 0xda || marker === 0xd9) return false;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (length < 2 || offset + 2 + length > bytes.length) return true;
    if (marker === 0xe1 || marker === 0xed || marker === 0xfe) return true;
    offset += 2 + length;
  }
  return true;
}

export function sanitizeJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('The selected image could not be safely prepared.');
  }

  const chunks: Uint8Array[] = [bytes.slice(0, 2)];
  let totalLength = 2;
  let offset = 2;

  while (offset < bytes.length) {
    const markerStart = offset;
    if (bytes[offset] !== 0xff) {
      throw new Error('The selected image could not be safely prepared.');
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) {
      throw new Error('The selected image could not be safely prepared.');
    }
    const marker = bytes[offset]!;
    if (marker === 0x00) {
      throw new Error('The selected image could not be safely prepared.');
    }
    if (marker === 0xda || marker === 0xd9) {
      const tail = bytes.slice(markerStart);
      chunks.push(tail);
      totalLength += tail.length;
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      const standalone = bytes.slice(markerStart, offset + 1);
      chunks.push(standalone);
      totalLength += standalone.length;
      offset += 1;
      continue;
    }
    if (offset + 2 >= bytes.length) {
      throw new Error('The selected image could not be safely prepared.');
    }
    const length = (bytes[offset + 1]! << 8) | bytes[offset + 2]!;
    const segmentEnd = offset + 1 + length;
    if (length < 2 || segmentEnd > bytes.length) {
      throw new Error('The selected image could not be safely prepared.');
    }
    if (marker !== 0xe1 && marker !== 0xed && marker !== 0xfe) {
      const segment = bytes.slice(markerStart, segmentEnd);
      chunks.push(segment);
      totalLength += segment.length;
    }
    offset = segmentEnd;
  }

  if (chunks.length < 2) {
    throw new Error('The selected image could not be safely prepared.');
  }
  const sanitized = new Uint8Array(totalLength);
  let destinationOffset = 0;
  for (const chunk of chunks) {
    sanitized.set(chunk, destinationOffset);
    destinationOffset += chunk.length;
  }
  if (containsSensitiveJpegMetadata(sanitized)) {
    throw new Error('The selected image could not be safely prepared.');
  }
  return sanitized;
}

function ensureRoot(): void {
  imageRoot.create({ intermediates: true, idempotent: true });
}

function fileForCacheKey(cacheKey: string): File {
  const segments = cacheKey.split('/');
  if (segments.some((segment) => !/^[a-zA-Z0-9._-]+$/.test(segment)) || segments.includes('..')) {
    throw new Error('Invalid medicine image cache key.');
  }
  return new File(imageRoot, ...segments);
}

export function medicinePhotoUri(cacheKey: string): string | null {
  const file = fileForCacheKey(cacheKey);
  return file.exists ? file.uri : null;
}

async function normalizeAsset(
  asset: ImagePicker.ImagePickerAsset,
): Promise<MedicinePhotoSelection> {
  if (!asset.width || !asset.height) {
    throw new PhotoPreparationError('This photo couldn’t be read. Choose another and try again.');
  }
  ensureRoot();
  const staging = new Directory(imageRoot, 'staging');
  staging.create({ intermediates: true, idempotent: true });
  const imageId = Crypto.randomUUID();

  for (const compress of compressionAttempts) {
    const context = ImageManipulator.manipulate(asset.uri);
    const [resize] = resizeAction(asset.width, asset.height);
    if (resize && 'resize' in resize) context.resize(resize.resize);
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ compress, format: SaveFormat.JPEG });
    const temporary = new File(result.uri);
    let bytes: Uint8Array;
    try {
      bytes = sanitizeJpegMetadata(await temporary.bytes());
    } catch (error) {
      if (temporary.exists) temporary.delete();
      throw error;
    }
    if (bytes.byteLength > maxBytes) {
      if (temporary.exists) temporary.delete();
      continue;
    }
    const digest = await sha256Hex(bytes);
    const cacheKey = `staging/${imageId}.jpg`;
    const destination = fileForCacheKey(cacheKey);
    destination.create({ overwrite: true });
    destination.write(bytes);
    if (temporary.exists) temporary.delete();
    const image = stagedMedicationImageSchema.parse({
      imageId,
      cacheKey,
      sha256: digest,
      byteCount: bytes.byteLength,
      width: result.width,
      height: result.height,
    });
    return { kind: 'selected', image, uri: destination.uri };
  }
  throw new PhotoPreparationError('Choose a smaller photo and try again.');
}

export async function selectMedicinePhoto(
  source: MedicinePhotoSource,
): Promise<MedicinePhotoSelection> {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { kind: 'permission-denied', canAskAgain: permission.canAskAgain };
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 1,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return { kind: 'cancelled' };
    return normalizeAsset(result.assets[0]);
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
    if (code === 'ERR_MISSING_PERMISSION') {
      return { kind: 'permission-denied', canAskAgain: false };
    }
    if (code === 'ERR_CAMERA_UNAVAILABLE') return { kind: 'unavailable' };
    throw asPhotoPreparationError(error);
  }
}

async function accountNamespace(accountId: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, accountId);
}

async function attachedCacheKey(input: {
  accountId: string;
  medicationId: string;
  imageId: string;
}): Promise<string> {
  const namespace = await accountNamespace(input.accountId);
  return `accounts/${namespace}/medicines/${input.medicationId}/${input.imageId}.jpg`;
}

export async function attachStagedMedicinePhoto(input: {
  accountId: string;
  medicationId: string;
  staged: StagedMedicationImage;
}): Promise<MedicationImage> {
  const staged = stagedMedicationImageSchema.parse(input.staged);
  const source = fileForCacheKey(staged.cacheKey);
  if (!source.exists) throw new Error('The prepared medicine photo is no longer available.');
  const cacheKey = await attachedCacheKey({
    accountId: input.accountId,
    medicationId: input.medicationId,
    imageId: staged.imageId,
  });
  const directory = fileForCacheKey(cacheKey).parentDirectory;
  directory.create({ intermediates: true, idempotent: true });
  await source.move(fileForCacheKey(cacheKey), { overwrite: true });
  return medicationImageSchema.parse({
    ...staged,
    medicationId: input.medicationId,
    cacheKey,
    remoteVersion: null,
    transferState: 'pendingUpload',
    updatedAt: new Date().toISOString(),
    lastError: null,
  });
}

export async function downloadMedicinePhotoToCache(input: {
  accountId: string;
  medicationId: string;
  imageId: string;
  url: string;
  sha256: string;
  byteCount: number;
}): Promise<{ cacheKey: string; uri: string }> {
  const cacheKey = await attachedCacheKey(input);
  const destination = fileForCacheKey(cacheKey);
  destination.parentDirectory.create({ intermediates: true, idempotent: true });

  try {
    await File.downloadFileAsync(input.url, destination, { idempotent: true });
    const bytes = await destination.bytes();
    if (bytes.byteLength !== input.byteCount || bytes.byteLength > maxBytes) {
      throw new Error('The downloaded medicine photo has an unexpected size.');
    }
    if (containsSensitiveJpegMetadata(bytes)) {
      throw new Error('The downloaded medicine photo is not a safe JPEG.');
    }
    const digest = await sha256Hex(bytes);
    if (digest !== input.sha256) {
      throw new Error('The downloaded medicine photo failed its integrity check.');
    }
    return { cacheKey, uri: destination.uri };
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
}

export function deleteCachedMedicinePhoto(cacheKey: string): void {
  const file = fileForCacheKey(cacheKey);
  if (file.exists) file.delete();
}

export async function purgeMedicinePhotoCacheForAccount(accountId: string): Promise<void> {
  const namespace = await accountNamespace(accountId);
  const directory = new Directory(imageRoot, 'accounts', namespace);
  if (directory.exists) directory.delete();
}
