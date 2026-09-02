import * as Crypto from 'expo-crypto';

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const nativeBytes = Uint8Array.from(bytes);
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, nativeBytes);
  return toHex(digest);
}
