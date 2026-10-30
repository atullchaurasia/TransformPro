import { getCurrentStaffId } from '@/store/sessionStore';
import { newId, nowIso } from '@/utils/id';

import type { Db } from '../types';

export type AuditEntry = {
  /** e.g. 'member.create', 'payment.delete', 'backup.restore', 'auth.login'. */
  action: string;
  entity: string;
  entityId?: string | null;
  /** Human-readable, e.g. "Added member Rahul Sharma (TP0001)". */
  summary: string;
  /** Defaults to the logged-in staff member. */
  staffId?: string | null;
};

/**
 * Append to the audit log (spec §5.2 audit_log). Call it with the SAME `tx` as the change it
 * describes, so the log entry and the change commit or roll back together.
 */
export async function writeAudit(db: Db, entry: AuditEntry): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    'INSERT INTO audit_log (id, staff_id, action, entity, entity_id, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [newId(), entry.staffId !== undefined ? entry.staffId : getCurrentStaffId(), entry.action, entry.entity, entry.entityId ?? null, entry.summary, now, now],
  );
}
