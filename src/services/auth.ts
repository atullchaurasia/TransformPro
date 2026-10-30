// PIN hashing (expo-crypto) and Face ID / Touch ID (expo-local-authentication).
// Every native call is wrapped: in Expo Go biometrics may be unavailable or fall back to
// the device passcode, and the app must keep working (CLAUDE.md §2).
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

import { bytesToHex, hashPin, verifyPin, type Sha256 } from '@/domain/pin';
import { logger } from '@/utils/logger';

const sha256: Sha256 = (input) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);

export function newSalt(): string {
  return bytesToHex(Crypto.getRandomBytes(16));
}

/** New salt + SHA-256(salt + pin), ready to store on the staff row. */
export async function createPinHash(pin: string): Promise<{ pinHash: string; pinSalt: string }> {
  const pinSalt = newSalt();
  return { pinHash: await hashPin(sha256, pinSalt, pin), pinSalt };
}

export async function checkPin(pin: string, salt: string | null, hash: string | null): Promise<boolean> {
  if (!salt || !hash) return false;
  return verifyPin(sha256, salt, pin, hash);
}

/** Device has Face ID / Touch ID hardware AND the user has enrolled a face or finger. */
export async function biometricsAvailable(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch (e) {
    logger.warn('Biometrics check failed', e);
    return false;
  }
}

export type BiometricResult = 'success' | 'cancelled' | 'unavailable' | 'failed';

export async function authenticateBiometric(promptMessage: string, cancelLabel: string): Promise<BiometricResult> {
  try {
    if (!(await biometricsAvailable())) return 'unavailable';
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel, disableDeviceFallback: false });
    if (result.success) return 'success';
    return result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel' ? 'cancelled' : 'failed';
  } catch (e) {
    logger.warn('Biometric authentication failed', e);
    return 'unavailable';
  }
}
