// Restore confirmation (§10.15 step 3): typing RESTORE + the owner's PIN. On a fresh install
// (onboarding "Restore a backup") there is no owner yet, so only RESTORE is asked for.
import { getDb } from '@/db/client';
import { getOwner } from '@/db/repositories/staff';
import { cooldownRemaining, recordFailure, recordSuccess } from '@/domain/lockout';
import { checkPin } from '@/services/auth';
import { readLockout, writeLockout } from '@/services/secureStore';

export const RESTORE_WORD = 'RESTORE';

export async function ownerHasPin(): Promise<boolean> {
  const owner = await getOwner(getDb());
  return !!owner?.pinHash;
}

/** Wrong PINs share the lock screen's cooldown, so restore can't be used to guess the PIN. */
export async function verifyOwnerPin(pin: string, now = Date.now()): Promise<{ ok: true } | { ok: false; cooldownMs: number }> {
  const lockout = await readLockout();
  const wait = cooldownRemaining(lockout, now);
  if (wait > 0) return { ok: false, cooldownMs: wait };
  const owner = await getOwner(getDb());
  if (owner?.pinHash && (await checkPin(pin, owner.pinSalt, owner.pinHash))) {
    await writeLockout(recordSuccess());
    return { ok: true };
  }
  const next = recordFailure(lockout, now);
  await writeLockout(next);
  return { ok: false, cooldownMs: cooldownRemaining(next, now) };
}
