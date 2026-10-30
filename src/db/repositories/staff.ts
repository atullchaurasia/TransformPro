import type { Staff } from '../models';
import type { Db } from '../types';

import { staffRepo } from './index';

/** Staff shown on the lock screen: active, not deleted, with a PIN set. Owner first. */
export async function listLoginStaff(db: Db): Promise<Staff[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM staff
     WHERE deleted_at IS NULL AND is_active = 1 AND pin_hash IS NOT NULL
     ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END, name COLLATE NOCASE`,
    [],
  );
  return rows.map(staffRepo.fromRow);
}

export async function getOwner(db: Db): Promise<Staff | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM staff WHERE role = 'owner' AND deleted_at IS NULL LIMIT 1",
    [],
  );
  return row ? staffRepo.fromRow(row) : null;
}

export async function setStaffPin(db: Db, staffId: string, pinHash: string, pinSalt: string): Promise<void> {
  await staffRepo.update(db, staffId, { pinHash, pinSalt });
}
