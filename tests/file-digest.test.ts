import * as Crypto from 'expo-crypto';

import { sha256Hex } from '@/services/file-digest';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digest: jest.fn(),
}));

const mockedDigest = jest.mocked(Crypto.digest);

describe('file digest native boundary', () => {
  afterEach(() => jest.clearAllMocks());

  test('passes typed bytes directly to Expo Crypto and returns lowercase hex', async () => {
    mockedDigest.mockResolvedValue(new Uint8Array([0x00, 0x0f, 0xa1, 0xff]).buffer);
    const bytes = new Uint8Array([1, 2, 3]);

    await expect(sha256Hex(bytes)).resolves.toBe('000fa1ff');
    expect(mockedDigest).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      expect.any(Uint8Array),
    );
    expect(mockedDigest.mock.calls[0]?.[1]).toEqual(bytes);
    expect(mockedDigest.mock.calls[0]?.[1]).toBeInstanceOf(Uint8Array);
  });
});
