import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import {
  medicationImageSchema,
  stagedMedicationImageSchema,
  type MedicationImage,
  type StagedMedicationImage,
} from '@/models/medication-image';

const maxEdge = 1_024;
const maxBytes = 1_048_576;
const compressionAttempts = [0.82, 0.68, 0.54] as const;
const imageRoot = new Directory(Paths.document, 'medicine-images');

export type MedicinePhotoSelection =
  | { kind: 'selected'; image: StagedMedicationImage; uri: string }
  | { kind: 'cancelled' }
  | { kind: 'permission-denied' };

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

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
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
  if (!asset.width || !asset.height) throw new Error('The selected image could not be read.');
  ensureRoot();
  const staging = new Directory(imageRoot, 'staging');
  staging.create({ intermediates: true, idempotent: true });
  const imageId = Crypto.randomUUID();

  for (const compress of compressionAttempts) {
    const result = await manipulateAsync(asset.uri, resizeAction(asset.width, asset.height), {
      compress,
      format: SaveFormat.JPEG,
    });
    const temporary = new File(result.uri);
    const bytes = await temporary.bytes();
    if (bytes.byteLength > maxBytes) {
      if (temporary.exists) temporary.delete();
      continue;
    }
    if (containsSensitiveJpegMetadata(bytes)) {
      if (temporary.exists) temporary.delete();
      throw new Error('The selected image could not be safely prepared.');
    }
    const digest = toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));
    const cacheKey = `staging/${imageId}.jpg`;
    const destination = fileForCacheKey(cacheKey);
    await temporary.move(destination, { overwrite: true });
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
  throw new Error('Choose a smaller image and try again.');
}

export async function selectMedicinePhoto(): Promise<MedicinePhotoSelection> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return { kind: 'cancelled' };
    return normalizeAsset(result.assets[0]);
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
    if (code === 'ERR_MISSING_PERMISSION') return { kind: 'permission-denied' };
    throw error;
  }
}

async function accountNamespace(accountId: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, accountId);
}

export async function attachStagedMedicinePhoto(input: {
  accountId: string;
  medicationId: string;
  staged: StagedMedicationImage;
}): Promise<MedicationImage> {
  const staged = stagedMedicationImageSchema.parse(input.staged);
  const source = fileForCacheKey(staged.cacheKey);
  if (!source.exists) throw new Error('The prepared medicine photo is no longer available.');
  const namespace = await accountNamespace(input.accountId);
  const directory = new Directory(
    imageRoot,
    'accounts',
    namespace,
    'medicines',
    input.medicationId,
  );
  directory.create({ intermediates: true, idempotent: true });
  const cacheKey = `accounts/${namespace}/medicines/${input.medicationId}/${staged.imageId}.jpg`;
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

export function deleteCachedMedicinePhoto(cacheKey: string): void {
  const file = fileForCacheKey(cacheKey);
  if (file.exists) file.delete();
}

export async function purgeMedicinePhotoCacheForAccount(accountId: string): Promise<void> {
  const namespace = await accountNamespace(accountId);
  const directory = new Directory(imageRoot, 'accounts', namespace);
  if (directory.exists) directory.delete();
}
