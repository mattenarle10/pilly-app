import {
  containsSensitiveJpegMetadata,
  resizeAction,
  sanitizeJpegMetadata,
} from '@/services/medicine-image-cache';

function jpegWithMarker(marker: number, payload: number[] = []): Uint8Array {
  const length = payload.length + 2;
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    marker,
    length >> 8,
    length & 0xff,
    ...payload,
    0xff,
    0xda,
    0x00,
    0x02,
  ]);
}

describe('medicine image normalization rules', () => {
  test('keeps a small image at its decoded dimensions', () => {
    expect(resizeAction(800, 600)).toEqual([]);
  });

  test('bounds the longest edge while preserving orientation', () => {
    expect(resizeAction(3_000, 2_000)).toEqual([{ resize: { width: 1_024 } }]);
    expect(resizeAction(2_000, 3_000)).toEqual([{ resize: { height: 1_024 } }]);
  });

  test('allows ordinary re-encoded JPEG container data', () => {
    expect(containsSensitiveJpegMetadata(jpegWithMarker(0xe0, [0x4a, 0x46, 0x49, 0x46]))).toBe(
      false,
    );
  });

  test.each([0xe1, 0xed, 0xfe])('rejects sensitive JPEG marker %#', (marker) => {
    expect(containsSensitiveJpegMetadata(jpegWithMarker(marker, [1, 2, 3]))).toBe(true);
  });

  test.each([0xe1, 0xed, 0xfe])('removes sensitive JPEG marker %#', (marker) => {
    const sanitized = sanitizeJpegMetadata(jpegWithMarker(marker, [1, 2, 3]));

    expect(containsSensitiveJpegMetadata(sanitized)).toBe(false);
    expect([...sanitized]).toEqual([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02]);
  });

  test('keeps ordinary JPEG segments and encoded scan bytes', () => {
    const encoded = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x06, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xe1, 0x00, 0x05, 0x45,
      0x58, 0x49, 0xff, 0xda, 0x00, 0x02, 0x12, 0xff, 0x00, 0x34, 0xff, 0xd9,
    ]);

    expect([...sanitizeJpegMetadata(encoded)]).toEqual([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x06, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xda, 0x00, 0x02, 0x12,
      0xff, 0x00, 0x34, 0xff, 0xd9,
    ]);
  });

  test('rejects malformed or non-JPEG output', () => {
    expect(containsSensitiveJpegMetadata(new Uint8Array([1, 2, 3]))).toBe(true);
    expect(containsSensitiveJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 20]))).toBe(
      true,
    );
    expect(() => sanitizeJpegMetadata(new Uint8Array([1, 2, 3]))).toThrow(
      'could not be safely prepared',
    );
    expect(() => sanitizeJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 20]))).toThrow(
      'could not be safely prepared',
    );
  });
});
