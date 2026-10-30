// expo-secure-store (iOS Keychain) for the lock settings and the wrong-PIN lockout (§1, §8).
// The lockout lives here, not in SQLite, so force-quitting the app doesn't reset a cooldown.
// PIN hashes + salts stay on the staff rows (§5.2) so they travel with backups.
import * as SecureStore from 'expo-secure-store';

import { INITIAL_LOCKOUT, parseLockout, type LockoutState } from '@/domain/lockout';
import { logger } from '@/utils/logger';

const KEYS = { lock: 'transformpro.lock_settings', lockout: 'transformpro.lockout' } as const;
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export type LockSettings = { lockEnabled: boolean; lockAfterMinutes: number; biometricEnabled: boolean };

async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, OPTIONS);
  } catch (e) {
    logger.warn('SecureStore read failed', e);
    return null;
  }
}

async function write(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, OPTIONS);
  } catch (e) {
    logger.warn('SecureStore write failed', e);
  }
}

export async function readLockSettings(): Promise<LockSettings | null> {
  const raw = await read(KEYS.lock);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<LockSettings>;
    if (typeof v.lockEnabled !== 'boolean' || typeof v.lockAfterMinutes !== 'number' || typeof v.biometricEnabled !== 'boolean') return null;
    return { lockEnabled: v.lockEnabled, lockAfterMinutes: v.lockAfterMinutes, biometricEnabled: v.biometricEnabled };
  } catch {
    return null;
  }
}

export function writeLockSettings(settings: LockSettings): Promise<void> {
  return write(KEYS.lock, JSON.stringify(settings));
}

export async function readLockout(): Promise<LockoutState> {
  return parseLockout(await read(KEYS.lockout));
}

export function writeLockout(state: LockoutState): Promise<void> {
  return write(KEYS.lockout, JSON.stringify(state));
}

export function clearLockout(): Promise<void> {
  return writeLockout(INITIAL_LOCKOUT);
}
