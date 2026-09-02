const defaultMessage = 'This photo couldn’t be prepared. Choose another and try again.';

export class PhotoPreparationError extends Error {
  constructor(message = defaultMessage) {
    super(message);
    this.name = 'PhotoPreparationError';
  }
}

export function asPhotoPreparationError(error: unknown): PhotoPreparationError {
  return error instanceof PhotoPreparationError ? error : new PhotoPreparationError();
}
