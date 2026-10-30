// PIN rules (spec §7–8). Hashing itself is injected so this stays pure and testable;
// the app passes expo-crypto's SHA-256 (src/services/auth.ts).

export const PIN_MIN = 4;
export const PIN_MAX = 6;

export type PinError = 'too_short' | 'not_digits' | 'mismatch';

export function validatePin(pin: string, confirm?: string): PinError | null {
  if (!/^\d*$/.test(pin)) return 'not_digits';
  if (pin.length < PIN_MIN || pin.length > PIN_MAX) return 'too_short';
  if (confirm !== undefined && confirm !== pin) return 'mismatch';
  return null;
}

export type Sha256 = (input: string) => Promise<string>;

/** Stored as SHA-256(salt + pin) — never the PIN itself (§8). */
export function hashPin(sha256: Sha256, salt: string, pin: string): Promise<string> {
  return sha256(salt + pin);
}

/** Compares in constant time for equal-length hashes. */
export async function verifyPin(sha256: Sha256, salt: string, pin: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPin(sha256, salt, pin);
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
