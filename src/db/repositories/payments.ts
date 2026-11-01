import { advancesToApply } from '@/domain/dues';
import { formatPaise } from '@/domain/money';
import type { PaymentPlan } from '@/domain/newMember';

import type { Member, Payment, PaymentMode, Subscription } from '../models';
import type { Db } from '../types';

import { writeAudit } from './audit';
import { allocateReceiptNumber } from './codes';
import { paymentsRepo } from './index';

type PaymentMember = Pick<Member, 'id' | 'fullName' | 'branchId'>;

export type PaymentDetails = Pick<Payment, 'mode' | 'reference' | 'paidOn' | 'note'> & { mode: PaymentMode };

/** One payment (or refund) row with its own receipt number, plus the audit entry (§6.7). */
export async function insertPayment(
  tx: Db,
  input: {
    member: PaymentMember;
    subscription: Pick<Subscription, 'id' | 'planNameSnapshot'> | null;
    amountPaise: number;
    details: PaymentDetails;
    receivedBy: string | null;
    isRefund: boolean;
    currency: string;
  },
): Promise<Payment> {
  const { member, subscription, details } = input;
  const payment = await paymentsRepo.create(tx, {
    receiptNumber: await allocateReceiptNumber(tx),
    memberId: member.id,
    subscriptionId: subscription?.id ?? null,
    branchId: member.branchId,
    amountPaise: input.amountPaise,
    mode: details.mode,
    reference: details.reference,
    paidOn: details.paidOn,
    note: details.note,
    receivedBy: input.receivedBy,
    isRefund: input.isRefund,
  });
  const amount = formatPaise(payment.amountPaise, input.currency);
  const target = subscription ? ` for ${subscription.planNameSnapshot}` : ' (advance)';
  await writeAudit(tx, {
    action: input.isRefund ? 'payment.refund' : 'payment.create',
    entity: 'payment',
    entityId: payment.id,
    summary: input.isRefund
      ? `${payment.receiptNumber}: refunded ${amount} to ${member.fullName}${target}`
      : `${payment.receiptNumber}: ${amount} from ${member.fullName}${target}`,
  });
  return payment;
}

/**
 * Records "paid now" split across the new subscriptions (index = position in
 * `subscriptions`, null = advance). One row and receipt per part (Decisions Log M06).
 */
export async function recordPlanPayments(
  tx: Db,
  input: { member: PaymentMember; subscriptions: Subscription[]; plan: PaymentPlan; details: PaymentDetails; receivedBy: string | null; currency: string },
): Promise<Payment[]> {
  const payments: Payment[] = [];
  for (const a of input.plan.allocations) {
    const subscription = a.index === null ? null : input.subscriptions[a.index];
    if (a.index !== null && !subscription) throw new Error('Payment allocated to an unknown subscription');
    payments.push(
      await insertPayment(tx, {
        member: input.member,
        subscription: subscription ?? null,
        amountPaise: a.amountPaise,
        details: input.details,
        receivedBy: input.receivedBy,
        isRefund: false,
        currency: input.currency,
      }),
    );
  }
  return payments;
}

export async function listMemberPayments(db: Db, memberId: string): Promise<Payment[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM payments WHERE member_id = ? ORDER BY paid_on DESC, created_at DESC', [memberId]);
  return rows.map(paymentsRepo.fromRow);
}

/**
 * Links the member's unapplied advance payments to a new subscription (§6.5 "auto-applies
 * to the next subscription created"). Returns the amount applied.
 */
export async function applyAdvances(tx: Db, member: Pick<Member, 'id' | 'fullName'>, sub: Subscription, currency: string): Promise<number> {
  const payments = await listMemberPayments(tx, member.id);
  const ids = advancesToApply(payments, sub.totalPaise);
  let applied = 0;
  for (const id of ids) {
    const p = await paymentsRepo.update(tx, id, { subscriptionId: sub.id });
    applied += p.amountPaise;
    await writeAudit(tx, {
      action: 'payment.update',
      entity: 'payment',
      entityId: p.id,
      summary: `${p.receiptNumber}: advance of ${formatPaise(p.amountPaise, currency)} applied to ${sub.planNameSnapshot} for ${member.fullName}`,
    });
  }
  return applied;
}

/**
 * Record payment (§10.5): one row + receipt per part of the split (oldest-first or manual,
 * already validated by `allocatePayment` / `validateManualAllocation`); null = advance.
 */
export async function recordPayment(
  tx: Db,
  input: {
    member: PaymentMember;
    allocations: { subscriptionId: string | null; amountPaise: number }[];
    subscriptions: Pick<Subscription, 'id' | 'planNameSnapshot'>[];
    details: PaymentDetails;
    receivedBy: string | null;
    currency: string;
  },
): Promise<Payment[]> {
  const subs = new Map(input.subscriptions.map((s) => [s.id, s]));
  const out: Payment[] = [];
  for (const a of input.allocations) {
    const subscription = a.subscriptionId ? subs.get(a.subscriptionId) : null;
    if (a.subscriptionId && !subscription) throw new Error('Payment allocated to an unknown subscription');
    out.push(await insertPayment(tx, { member: input.member, subscription: subscription ?? null, amountPaise: a.amountPaise, details: input.details, receivedBy: input.receivedBy, isRefund: false, currency: input.currency }));
  }
  return out;
}

/** Refund (§10.5): an `is_refund` row with its own receipt number, against a plan or the advance. */
export function recordRefund(
  tx: Db,
  input: { member: PaymentMember; subscription: Pick<Subscription, 'id' | 'planNameSnapshot'> | null; amountPaise: number; details: PaymentDetails; receivedBy: string | null; currency: string },
): Promise<Payment> {
  return insertPayment(tx, { ...input, isRefund: true });
}

/** Delete = move to Trash (§13: owner only, never a hard delete from normal UI, audit-logged). */
export async function softDeletePayment(tx: Db, payment: Pick<Payment, 'id' | 'receiptNumber' | 'amountPaise' | 'isRefund'>, memberName: string, currency: string): Promise<void> {
  await paymentsRepo.softDelete(tx, payment.id);
  await writeAudit(tx, {
    action: 'payment.delete',
    entity: 'payment',
    entityId: payment.id,
    summary: `${payment.receiptNumber}: deleted ${payment.isRefund ? 'refund' : 'payment'} of ${formatPaise(payment.amountPaise, currency)} (${memberName})`,
  });
}

export async function restorePayment(tx: Db, payment: Pick<Payment, 'id' | 'receiptNumber'>, memberName: string): Promise<void> {
  await paymentsRepo.restore(tx, payment.id);
  await writeAudit(tx, { action: 'payment.restore', entity: 'payment', entityId: payment.id, summary: `${payment.receiptNumber}: restored from Trash (${memberName})` });
}

/** Trash → Delete permanently / auto-purge. The receipt number is still never reused (counter). */
export async function deletePaymentPermanently(tx: Db, payment: Pick<Payment, 'id' | 'receiptNumber'>, memberName: string, reason: 'manual' | 'auto_purge'): Promise<void> {
  await paymentsRepo.hardDelete(tx, payment.id);
  await writeAudit(tx, {
    action: 'payment.delete_permanent',
    entity: 'payment',
    entityId: payment.id,
    summary: `${payment.receiptNumber}: ${reason === 'auto_purge' ? 'auto-purged' : 'permanently deleted'} (${memberName})`,
  });
}

/** Payment rows linked to a subscription, deleted ones included (they still hold the FK). */
export async function countSubscriptionPayments(db: Db, subscriptionId: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM payments WHERE subscription_id = ?', [subscriptionId]);
  return row?.n ?? 0;
}
