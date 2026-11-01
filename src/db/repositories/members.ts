import type { ListSubscription, MemberListRow } from '@/domain/memberList';

import type { Member } from '../models';
import type { BindValue, Db } from '../types';

import { membersRepo, subscriptionsRepo } from './index';

const LIST_COLUMNS =
  'id, member_code, full_name, phone, photo_uri, gender, date_of_birth, anniversary_date, joining_date, created_at, branch_id, assigned_trainer_id';

type Row = Record<string, unknown>;

const toListRow = (r: Row): MemberListRow => membersRepo.fromRow(r) as unknown as MemberListRow;

/** `LIKE` pattern for a user's text, with % and _ escaped. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * WHERE clause for the search box (§10.2): name, phone or code, case-insensitive. Digits are
 * also matched against the phone without the country code, so "98765" finds 919876543210.
 */
function searchClause(search: string): { sql: string; params: BindValue[] } {
  const q = search.trim();
  if (!q) return { sql: '', params: [] };
  const like = likePattern(q);
  const digits = q.replace(/\D/g, '');
  const phoneLike = digits.length >= 3 ? likePattern(digits) : like;
  return {
    sql: " AND (full_name LIKE ? ESCAPE '\\' OR member_code LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR alt_phone LIKE ? ESCAPE '\\')",
    params: [like, like, phoneLike, phoneLike],
  };
}

export type MemberListData = {
  members: MemberListRow[];
  subscriptions: ListSubscription[];
  /** `toDate` = last frozen day of a fixed freeze (null = open-ended) — for "frozen ending soon". */
  openFreezes: { memberId: string; subscriptionId: string; endedAt: string | null; toDate: string | null }[];
  netPaidBySubscription: Map<string, number>;
  advanceByMember: Map<string, number>;
  lastVisitByMember: Map<string, string>;
};

/** Everything the list needs in five bulk queries — fast enough for 2,000+ members. */
export async function loadMemberListData(db: Db, search = ''): Promise<MemberListData> {
  const where = searchClause(search);
  const members = (
    await db.getAllAsync<Row>(`SELECT ${LIST_COLUMNS} FROM members WHERE deleted_at IS NULL${where.sql} ORDER BY full_name COLLATE NOCASE`, where.params)
  ).map(toListRow);

  const subscriptions = (
    await db.getAllAsync<Row>(
      `SELECT s.id, s.member_id, s.plan_id, s.plan_name_snapshot, s.category_snapshot, s.start_date, s.end_date, s.status,
              s.trainer_id, s.sessions_total, s.sessions_used, s.total_paise
       FROM subscriptions s JOIN members m ON m.id = s.member_id AND m.deleted_at IS NULL
       WHERE s.status <> 'cancelled'`,
      [],
    )
  ).map((r) => subscriptionsRepo.fromRow(r) as unknown as ListSubscription);

  const openFreezes = await db.getAllAsync<{ memberId: string; subscriptionId: string; endedAt: null; toDate: string | null }>(
    'SELECT member_id AS memberId, subscription_id AS subscriptionId, NULL AS endedAt, to_date AS toDate FROM freezes WHERE ended_at IS NULL',
    [],
  );

  const paid = await db.getAllAsync<{ subscription_id: string | null; member_id: string; net: number }>(
    `SELECT subscription_id, member_id, SUM(CASE WHEN is_refund = 1 THEN -amount_paise ELSE amount_paise END) AS net
     FROM payments WHERE deleted_at IS NULL GROUP BY member_id, subscription_id`,
    [],
  );
  const netPaidBySubscription = new Map<string, number>();
  const advanceByMember = new Map<string, number>();
  for (const p of paid) {
    if (p.subscription_id) netPaidBySubscription.set(p.subscription_id, p.net);
    else advanceByMember.set(p.member_id, Math.max(0, p.net));
  }

  const visits = await db.getAllAsync<{ member_id: string; last: string }>('SELECT member_id, MAX(date) AS last FROM attendance GROUP BY member_id', []);
  const lastVisitByMember = new Map(visits.map((v) => [v.member_id, v.last]));

  return { members, subscriptions, openFreezes, netPaidBySubscription, advanceByMember, lastVisitByMember };
}

/** Quick search for the global search and the "Referred by" picker. */
export async function searchMembers(db: Db, search: string, limit = 30): Promise<MemberListRow[]> {
  const where = searchClause(search);
  const rows = await db.getAllAsync<Row>(
    `SELECT ${LIST_COLUMNS} FROM members WHERE deleted_at IS NULL${where.sql} ORDER BY full_name COLLATE NOCASE LIMIT ${Math.trunc(limit)}`,
    where.params,
  );
  return rows.map(toListRow);
}

/** Duplicate-phone check (§6.9): any member (incl. Trash) with this number as phone or alt phone. */
export async function findMembersByPhone(db: Db, phone: string, excludeId?: string): Promise<Member[]> {
  if (!phone) return [];
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM members WHERE (phone = ? OR alt_phone = ?) AND id <> ? ORDER BY deleted_at IS NOT NULL, full_name',
    [phone, phone, excludeId ?? ''],
  );
  return rows.map(membersRepo.fromRow);
}

/** Every phone / alt phone and member code in use, Trash included (CSV import duplicate checks). */
export async function listPhonesAndCodes(db: Db): Promise<{ phones: Set<string>; codes: Set<string> }> {
  const phones = await db.getAllAsync<{ p: string | null }>('SELECT phone AS p FROM members UNION SELECT alt_phone AS p FROM members WHERE alt_phone IS NOT NULL', []);
  const codes = await db.getAllAsync<{ c: string }>('SELECT member_code AS c FROM members', []);
  return { phones: new Set(phones.map((r) => r.p).filter((p): p is string => !!p)), codes: new Set(codes.map((r) => r.c)) };
}

export async function countMembers(db: Db): Promise<number> {
  return membersRepo.count(db);
}

// ---- Trash (§10.2) ----

export async function listTrashedMembers(db: Db): Promise<Member[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM members WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC', []);
  return rows.map(membersRepo.fromRow);
}

/** Members in Trash for longer than `days` (auto-purge on app open). */
export async function listPurgeableMembers(db: Db, olderThanIso: string): Promise<Member[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM members WHERE deleted_at IS NOT NULL AND deleted_at < ?', [olderThanIso]);
  return rows.map(membersRepo.fromRow);
}

/**
 * Permanent delete. Subscriptions, payments, attendance, measurements… CASCADE; referrals
 * and enquiry conversions pointing at the member become NULL (FKs in 001_init).
 */
export async function deleteMemberPermanently(tx: Db, id: string): Promise<void> {
  await membersRepo.hardDelete(tx, id);
}

export async function setTrainerForMembers(tx: Db, memberIds: string[], trainerId: string | null): Promise<void> {
  for (const id of memberIds) await membersRepo.update(tx, id, { assignedTrainerId: trainerId });
}
