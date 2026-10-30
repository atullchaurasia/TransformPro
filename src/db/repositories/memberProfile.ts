import type { AuditLog, Freeze, ISODate, Member, Payment, Plan, Subscription } from '../models';
import type { Db } from '../types';

import { auditLogRepo, freezesRepo, membersRepo, plansRepo, subscriptionsRepo } from './index';
import { listMemberPayments } from './payments';

type Row = Record<string, unknown>;

export type MemberRef = Pick<Member, 'id' | 'fullName' | 'memberCode'>;

export type MemberProfileData = {
  member: Member;
  subscriptions: Subscription[];
  freezes: Freeze[];
  /** All payment rows, deleted ones included (needed for "can this plan be deleted"). */
  payments: Payment[];
  /** Plans used by the member's subscriptions (deleted ones too) — freeze limits, durations. */
  plans: Map<string, Plan>;
  staffNames: Map<string, string>;
  lastVisit: ISODate | null;
  visitsThisMonth: number;
  referredBy: MemberRef | null;
  referrals: MemberRef[];
};

/** Everything the profile screen shows (§10.2), in a handful of indexed queries. */
export async function loadMemberProfileData(db: Db, memberId: string, month: { from: ISODate; to: ISODate }): Promise<MemberProfileData | null> {
  const member = await membersRepo.getById(db, memberId, { includeDeleted: true });
  if (!member) return null;

  const subscriptions = (await db.getAllAsync<Row>('SELECT * FROM subscriptions WHERE member_id = ? ORDER BY start_date DESC', [memberId])).map(subscriptionsRepo.fromRow);
  const freezes = (await db.getAllAsync<Row>('SELECT * FROM freezes WHERE member_id = ? ORDER BY from_date DESC', [memberId])).map(freezesRepo.fromRow);
  const payments = await listMemberPayments(db, memberId);
  const plans = new Map(
    (await db.getAllAsync<Row>('SELECT * FROM plans WHERE id IN (SELECT plan_id FROM subscriptions WHERE member_id = ?)', [memberId]))
      .map(plansRepo.fromRow)
      .map((p) => [p.id, p] as const),
  );
  const staffNames = new Map((await db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM staff', [])).map((s) => [s.id, s.name]));
  const visits = await db.getFirstAsync<{ last: string | null; month: number }>(
    'SELECT MAX(date) AS last, SUM(CASE WHEN date BETWEEN ? AND ? THEN 1 ELSE 0 END) AS month FROM attendance WHERE member_id = ?',
    [month.from, month.to, memberId],
  );

  const ref = (r: Row): MemberRef => ({ id: String(r.id), fullName: String(r.full_name), memberCode: String(r.member_code) });
  const referredByRow = member.referredByMemberId
    ? await db.getFirstAsync<Row>('SELECT id, full_name, member_code FROM members WHERE id = ?', [member.referredByMemberId])
    : null;
  const referrals = (
    await db.getAllAsync<Row>('SELECT id, full_name, member_code FROM members WHERE referred_by_member_id = ? AND deleted_at IS NULL ORDER BY full_name COLLATE NOCASE', [memberId])
  ).map(ref);

  return {
    member,
    subscriptions,
    freezes,
    payments,
    plans,
    staffNames,
    lastVisit: visits?.last ?? null,
    visitsThisMonth: visits?.month ?? 0,
    referredBy: referredByRow ? ref(referredByRow) : null,
    referrals,
  };
}

export type MemberAuditEntry = AuditLog & { staffName: string | null };

/** Audit history for one member: the member row, their plans and their payments (§10.2 More menu). */
export async function listMemberAudit(db: Db, memberId: string, limit = 200): Promise<MemberAuditEntry[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT a.*, s.name AS staff_name FROM audit_log a LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.entity_id = ?
        OR a.entity_id IN (SELECT id FROM subscriptions WHERE member_id = ?)
        OR a.entity_id IN (SELECT id FROM payments WHERE member_id = ?)
     ORDER BY a.created_at DESC LIMIT ${Math.trunc(limit)}`,
    [memberId, memberId, memberId],
  );
  return rows.map((r) => {
    const { staff_name, ...rest } = r;
    return { ...auditLogRepo.fromRow(rest), staffName: (staff_name as string | null) ?? null };
  });
}
