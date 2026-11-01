// Payment reads for the Payments tab, the profile, Trash and receipts (spec §10.5).
import type { ISODate, Member, Payment, Subscription } from '../models';
import type { Db } from '../types';

import { membersRepo, paymentsRepo, subscriptionsRepo } from './index';

type Row = Record<string, unknown>;

export type PaymentListRow = Payment & {
  memberName: string;
  memberCode: string;
  memberPhone: string;
  planName: string | null;
  staffName: string | null;
};

const SELECT = `SELECT p.*, m.full_name AS x_member_name, m.member_code AS x_member_code, m.phone AS x_member_phone,
  s.plan_name_snapshot AS x_plan_name, st.name AS x_staff_name
  FROM payments p
  JOIN members m ON m.id = p.member_id
  LEFT JOIN subscriptions s ON s.id = p.subscription_id
  LEFT JOIN staff st ON st.id = p.received_by`;

function toListRow(r: Row): PaymentListRow {
  const { x_member_name, x_member_code, x_member_phone, x_plan_name, x_staff_name, ...rest } = r;
  return {
    ...paymentsRepo.fromRow(rest),
    memberName: String(x_member_name),
    memberCode: String(x_member_code),
    memberPhone: String(x_member_phone),
    planName: (x_plan_name as string | null) ?? null,
    staffName: (x_staff_name as string | null) ?? null,
  };
}

/** Collections or refunds in a date range (inclusive), newest first. Members in Trash are left out. */
export async function listPaymentsInRange(db: Db, range: { from: ISODate; to: ISODate }, kind: 'payments' | 'refunds'): Promise<PaymentListRow[]> {
  const rows = await db.getAllAsync<Row>(
    `${SELECT} WHERE p.deleted_at IS NULL AND m.deleted_at IS NULL AND p.is_refund = ? AND p.paid_on BETWEEN ? AND ?
     ORDER BY p.paid_on DESC, p.created_at DESC`,
    [kind === 'refunds' ? 1 : 0, range.from, range.to],
  );
  return rows.map(toListRow);
}

/** A member's payments and refunds (profile Payments tab). */
export async function listMemberPaymentRows(db: Db, memberId: string): Promise<PaymentListRow[]> {
  const rows = await db.getAllAsync<Row>(`${SELECT} WHERE p.member_id = ? AND p.deleted_at IS NULL ORDER BY p.paid_on DESC, p.created_at DESC`, [memberId]);
  return rows.map(toListRow);
}

export async function listTrashedPayments(db: Db): Promise<PaymentListRow[]> {
  const rows = await db.getAllAsync<Row>(`${SELECT} WHERE p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC`, []);
  return rows.map(toListRow);
}

export async function listPurgeablePayments(db: Db, olderThanIso: string): Promise<PaymentListRow[]> {
  const rows = await db.getAllAsync<Row>(`${SELECT} WHERE p.deleted_at IS NOT NULL AND p.deleted_at < ?`, [olderThanIso]);
  return rows.map(toListRow);
}

export type ReceiptData = {
  payments: Payment[];
  /** Every payment (deleted too) of the plans on the receipt, for "balance after this payment". */
  allPayments: Payment[];
  subscriptions: Subscription[];
  member: Member;
  staffNames: Map<string, string>;
};

/** Everything a receipt for these payments needs. They must belong to one member. */
export async function loadReceiptData(db: Db, paymentIds: string[]): Promise<ReceiptData | null> {
  if (paymentIds.length === 0) return null;
  const marks = paymentIds.map(() => '?').join(', ');
  const payments = (await db.getAllAsync<Row>(`SELECT * FROM payments WHERE id IN (${marks})`, paymentIds)).map(paymentsRepo.fromRow);
  const first = payments[0];
  if (!first) return null;
  if (payments.some((p) => p.memberId !== first.memberId)) throw new Error('A receipt covers one member');
  const member = await membersRepo.getById(db, first.memberId, { includeDeleted: true });
  if (!member) return null;

  const subIds = [...new Set(payments.map((p) => p.subscriptionId).filter((id): id is string => !!id))];
  const subMarks = subIds.map(() => '?').join(', ');
  const subscriptions = subIds.length ? (await db.getAllAsync<Row>(`SELECT * FROM subscriptions WHERE id IN (${subMarks})`, subIds)).map(subscriptionsRepo.fromRow) : [];
  const allPayments = subIds.length ? (await db.getAllAsync<Row>(`SELECT * FROM payments WHERE subscription_id IN (${subMarks})`, subIds)).map(paymentsRepo.fromRow) : [];
  const staffNames = new Map((await db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM staff', [])).map((s) => [s.id, s.name]));
  return { payments, allPayments, subscriptions, member, staffNames };
}
