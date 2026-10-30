// Login / logout / PIN reset (spec §8). Screens call these; they talk to repositories.
import { getDb, writeTransaction } from '@/db/client';
import type { Staff } from '@/db/models';
import { writeAudit } from '@/db/repositories';
import { getOwner, listLoginStaff, setStaffPin } from '@/db/repositories/staff';
import { cooldownRemaining, recordFailure, recordSuccess, type LockoutState } from '@/domain/lockout';
import { checkPin, createPinHash } from '@/services/auth';
import { readLockout, writeLockout } from '@/services/secureStore';
import { getCurrentStaff, useSessionStore, type SessionStaff } from '@/store/sessionStore';

export const loadLoginStaff = (): Promise<Staff[]> => listLoginStaff(getDb());

export function toSessionStaff(s: Staff): SessionStaff {
  return { id: s.id, name: s.name, role: s.role, permissions: s.permissions, isActive: s.isActive, photoUri: s.photoUri };
}

async function logLogin(staff: Staff, method: 'pin' | 'biometric' | 'no_lock') {
  await writeTransaction((tx) =>
    writeAudit(tx, { action: 'auth.login', entity: 'staff', entityId: staff.id, staffId: staff.id, summary: `${staff.name} unlocked the app (${method})` }),
  );
}

export async function signIn(staff: Staff, method: 'pin' | 'biometric' | 'no_lock'): Promise<void> {
  useSessionStore.getState().unlock(toSessionStaff(staff));
  await logLogin(staff, method);
}

export type PinAttempt =
  | { ok: true }
  | { ok: false; reason: 'wrong'; lockout: LockoutState }
  | { ok: false; reason: 'cooldown'; lockout: LockoutState };

/** Checks a PIN against the lockout first, then the staff member's hash; signs in on success. */
export async function attemptPin(staff: Staff, pin: string, now = Date.now()): Promise<PinAttempt> {
  const lockout = await readLockout();
  if (cooldownRemaining(lockout, now) > 0) return { ok: false, reason: 'cooldown', lockout };
  if (await checkPin(pin, staff.pinSalt, staff.pinHash)) {
    await writeLockout(recordSuccess());
    await signIn(staff, 'pin');
    return { ok: true };
  }
  const next = recordFailure(lockout, now);
  await writeLockout(next);
  return { ok: false, reason: next.cooldownUntil ? 'cooldown' : 'wrong', lockout: next };
}

/** "Lock now" / "Switch user" from More or the Home header. */
export async function signOut(opts?: { switchUser?: boolean }): Promise<void> {
  const staff = getCurrentStaff();
  if (staff) {
    await writeTransaction((tx) =>
      writeAudit(tx, {
        action: 'auth.logout',
        entity: 'staff',
        entityId: staff.id,
        staffId: staff.id,
        summary: opts?.switchUser ? `${staff.name} switched user` : `${staff.name} locked the app`,
      }),
    );
  }
  useSessionStore.getState().lock(opts);
}

/** Lock without an audit entry (background timeout) — the next unlock is logged. */
export function autoLock(): void {
  useSessionStore.getState().lock();
}

/** Owner "Forgot PIN" after a successful Face ID check (§8). */
export async function resetOwnerPin(pin: string): Promise<Staff> {
  const owner = await getOwner(getDb());
  if (!owner) throw new Error('No owner account');
  const { pinHash, pinSalt } = await createPinHash(pin);
  await writeTransaction(async (tx) => {
    await setStaffPin(tx, owner.id, pinHash, pinSalt);
    await writeAudit(tx, { action: 'staff.pin_reset', entity: 'staff', entityId: owner.id, staffId: owner.id, summary: 'Owner reset their PIN using Face ID' });
  });
  await writeLockout(recordSuccess());
  return { ...owner, pinHash, pinSalt };
}

export const loadOwner = (): Promise<Staff | null> => getOwner(getDb());
