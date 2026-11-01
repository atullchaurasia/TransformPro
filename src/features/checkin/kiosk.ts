// Kiosk exit (§10.4 "exit requires PIN"): the PIN of whoever started the kiosk, or the owner's.
// Wrong PINs share the lock screen's cooldown, so the kiosk can't be brute-forced.
import { getDb } from '@/db/client';
import { staffRepo } from '@/db/repositories';
import { getOwner } from '@/db/repositories/staff';
import { cooldownRemaining, recordFailure, recordSuccess } from '@/domain/lockout';
import { checkPin } from '@/services/auth';
import { readLockout, writeLockout } from '@/services/secureStore';
import { useKioskStore } from '@/store/kioskStore';

export type KioskExit = { ok: true } | { ok: false; cooldownMs: number };

export async function tryExitKiosk(pin: string, now = Date.now()): Promise<KioskExit> {
  const lockout = await readLockout();
  const wait = cooldownRemaining(lockout, now);
  if (wait > 0) return { ok: false, cooldownMs: wait };

  const { startedBy } = useKioskStore.getState();
  const db = getDb();
  const candidates = [startedBy ? await staffRepo.getById(db, startedBy) : null, await getOwner(db)];
  for (const staff of candidates) {
    if (staff?.pinHash && (await checkPin(pin, staff.pinSalt, staff.pinHash))) {
      await writeLockout(recordSuccess());
      useKioskStore.getState().exit();
      return { ok: true };
    }
  }
  const next = recordFailure(lockout, now);
  await writeLockout(next);
  return { ok: false, cooldownMs: cooldownRemaining(next, now) };
}
