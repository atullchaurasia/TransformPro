// Member codes and receipt numbers (§6.7): allocated from settings counters INSIDE the
// caller's transaction, so the increment and the insert commit together.
import { formatMemberCode, formatReceiptNumber, normalizeCode } from '@/domain/codes';
import type { AppSettings } from '@/domain/settings';

import type { Db } from '../types';

import { loadSettings, setSetting } from './settings';

async function codeTaken(db: Db, code: string, excludeMemberId?: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM members WHERE member_code = ? COLLATE NOCASE AND id <> ? LIMIT 1',
    [code, excludeMemberId ?? ''],
  );
  return row !== null;
}

/** Checks the members table (incl. Trash — codes stay unique forever). */
export const isMemberCodeTaken = codeTaken;

/** The code the form pre-fills (not reserved until saved). */
export async function peekNextMemberCode(db: Db): Promise<string> {
  const s = await loadSettings(db);
  let n = s.next_member_number;
  while (await codeTaken(db, formatMemberCode(s.member_code_prefix, n))) n += 1;
  return formatMemberCode(s.member_code_prefix, n);
}

/**
 * Reserves the next free member code and advances `next_member_number`. Skips numbers the
 * owner already used by hand, so the auto code never collides.
 */
export async function allocateMemberCode(tx: Db, settings?: AppSettings): Promise<string> {
  const s = settings ?? (await loadSettings(tx));
  let n = s.next_member_number;
  while (await codeTaken(tx, formatMemberCode(s.member_code_prefix, n))) n += 1;
  await setSetting(tx, 'next_member_number', n + 1);
  return formatMemberCode(s.member_code_prefix, n);
}

/** Receipt numbers are never reused, even after a payment is deleted (§6.7). */
export async function allocateReceiptNumber(tx: Db): Promise<string> {
  const s = await loadSettings(tx);
  let n = s.next_receipt_number;
  for (;;) {
    const code = formatReceiptNumber(s.receipt_prefix, n);
    const taken = await tx.getFirstAsync<{ id: string }>('SELECT id FROM payments WHERE receipt_number = ? LIMIT 1', [code]);
    if (!taken) break;
    n += 1;
  }
  await setSetting(tx, 'next_receipt_number', n + 1);
  return formatReceiptNumber(s.receipt_prefix, n);
}

export { normalizeCode };
