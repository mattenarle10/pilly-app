import { Directory, File, Paths } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo-modules-core';

export class ProfilePhotoUnavailableError extends Error {}

export async function pickLocalProfilePhoto(): Promise<string | null> {
  if (!requireOptionalNativeModule('ExponentImagePicker')) {
    throw new ProfilePhotoUnavailableError('The photo picker is not installed in this build.');
  }
  const ImagePicker = await import('expo-image-picker');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) throw new Error('No photo selected.');
  const directory = new Directory(Paths.document, 'profile');
  directory.create({ idempotent: true, intermediates: true });
  const extension = asset.mimeType === 'image/png' ? 'png' : 'jpg';
  const destination = new File(directory, `avatar-${Date.now()}.${extension}`);
  await new File(asset.uri).copy(destination);
  return destination.uri;
}

export function deleteLocalProfilePhoto(uri: string | null | undefined): void {
  if (!uri?.startsWith(Paths.document.uri)) return;
  const photo = new File(uri);
  if (photo.exists) photo.delete();
}
