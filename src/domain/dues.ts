// Dues, payment allocation and advances (spec §6.5). All amounts are integer paise.
import type { ISODate, Paise, Payment, Subscription } from '@/db/models';

export type DuesSubscription = Pick<Subscription, 'id' | 'startDate' | 'totalPaise' | 'status' | 'createdAt'>;
export type DuesPayment = Pick<Payment, 'id' | 'subscriptionId' | 'amountPaise' | 'isRefund' | 'deletedAt' | 'paidOn' | 'createdAt'>;

const live = (p: DuesPayment) => p.deletedAt == null;
const signed = (p: DuesPayment) => (p.isRefund ? -p.amountPaise : p.amountPaise);

/** Payments minus refunds linked to one subscription (deleted payments ignored). */
export function netPaid(subscriptionId: string | null, payments: DuesPayment[]): Paise {
  return payments.filter((p) => live(p) && p.subscriptionId === subscriptionId).reduce((sum, p) => sum + signed(p), 0);
}

/**
 * Subscription due = total − (payments − refunds). A cancelled subscription owes nothing
 * more: cancelling settles it (any refund is recorded separately).
 */
export function subscriptionDue(sub: DuesSubscription, payments: DuesPayment[]): Paise {
  return dueFromNet(sub, netPaid(sub.id, payments));
}

/** Same rule when the net paid amount was already summed in SQL (lists of 2,000+ members). */
export function dueFromNet(sub: Pick<Subscription, 'totalPaise' | 'status'>, netPaidPaise: Paise): Paise {
  if (sub.status === 'cancelled') return 0;
  return Math.max(0, sub.totalPaise - netPaidPaise);
}

/** Most that can be refunded against a subscription: what was actually paid on it. */
export function maxRefundable(subscriptionId: string | null, payments: DuesPayment[]): Paise {
  return Math.max(0, netPaid(subscriptionId, payments));
}

/** Unapplied advance: payments with no subscription, minus refunds of those. */
export function advanceBalance(payments: DuesPayment[]): Paise {
  return Math.max(0, netPaid(null, payments));
}

const oldestFirst = (a: DuesSubscription, b: DuesSubscription) =>
  a.startDate.localeCompare(b.startDate) || a.createdAt.localeCompare(b.createdAt);

export type SubscriptionDue = { subscriptionId: string; duePaise: Paise };

export type MemberDues = {
  /** Open subscriptions with something still due, oldest first. */
  subscriptions: SubscriptionDue[];
  advancePaise: Paise;
  /** Sum of subscription dues + unlinked charges − unapplied advance (never negative). */
  totalDuePaise: Paise;
};

/**
 * Member due = Σ subscription dues + unlinked charges (§6.5). Any advance not yet linked
 * to a subscription is netted off, so the dues list never asks for money already paid.
 */
export function memberDues(
  subscriptions: DuesSubscription[],
  payments: DuesPayment[],
  unlinkedChargesPaise: Paise = 0,
): MemberDues {
  const dues = [...subscriptions]
    .sort(oldestFirst)
    .map((s) => ({ subscriptionId: s.id, duePaise: subscriptionDue(s, payments) }))
    .filter((d) => d.duePaise > 0);
  const advancePaise = advanceBalance(payments);
  const gross = dues.reduce((sum, d) => sum + d.duePaise, 0) + unlinkedChargesPaise;
  return { subscriptions: dues, advancePaise, totalDuePaise: Math.max(0, gross - advancePaise) };
}

export type Allocation = { subscriptionId: string | null; amountPaise: Paise };

export type AllocationResult =
  | { ok: true; allocations: Allocation[] }
  | { ok: false; error: 'invalid_amount' | 'overpayment' | 'over_due'; maxPaise: Paise };

/**
 * Splits a payment across open subscriptions, oldest unpaid first (§6.5). Anything left
 * over is an error unless the user records it as an advance (subscription = null).
 */
export function allocatePayment(amountPaise: Paise, dues: SubscriptionDue[], asAdvance = false): AllocationResult {
  const totalDue = dues.reduce((sum, d) => sum + d.duePaise, 0);
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) return { ok: false, error: 'invalid_amount', maxPaise: totalDue };

  const allocations: Allocation[] = [];
  let left = amountPaise;
  for (const due of dues) {
    if (left === 0) break;
    const take = Math.min(left, due.duePaise);
    if (take > 0) allocations.push({ subscriptionId: due.subscriptionId, amountPaise: take });
    left -= take;
  }
  if (left > 0) {
    if (!asAdvance) return { ok: false, error: 'overpayment', maxPaise: totalDue };
    allocations.push({ subscriptionId: null, amountPaise: left });
  }
  return { ok: true, allocations };
}

/** Validates a split the user entered by hand: each part must be > 0 and ≤ that subscription's due. */
export function validateManualAllocation(allocations: Allocation[], dues: SubscriptionDue[]): AllocationResult {
  for (const a of allocations) {
    if (!Number.isSafeInteger(a.amountPaise) || a.amountPaise <= 0) return { ok: false, error: 'invalid_amount', maxPaise: 0 };
    if (a.subscriptionId == null) continue;
    const due = dues.find((d) => d.subscriptionId === a.subscriptionId)?.duePaise ?? 0;
    if (a.amountPaise > due) return { ok: false, error: 'over_due', maxPaise: due };
  }
  return { ok: true, allocations };
}

/**
 * Which advance payments to link to a newly created subscription (§6.5 "auto-applies to
 * the next subscription created"). A payment row is linked whole, oldest first, while it
 * fits in the total; a payment that doesn't fit stays an advance and is still netted off
 * the member's dues by `memberDues`.
 */
export function advancesToApply(payments: DuesPayment[], newTotalPaise: Paise): string[] {
  // Refunds of advances reduce the pool; if any exist, only link while the net pool covers it.
  let pool = advanceBalance(payments);
  let room = newTotalPaise;
  const ids: string[] = [];
  const advances = payments
    .filter((p) => live(p) && p.subscriptionId == null && !p.isRefund)
    .sort((a, b) => a.paidOn.localeCompare(b.paidOn) || a.createdAt.localeCompare(b.createdAt));
  for (const p of advances) {
    if (p.amountPaise > room || p.amountPaise > pool) continue;
    ids.push(p.id);
    room -= p.amountPaise;
    pool -= p.amountPaise;
  }
  return ids;
}

/** The oldest unpaid subscription's start date — used to sort the Dues list by "oldest". */
export function oldestDueSince(subscriptions: DuesSubscription[], payments: DuesPayment[]): ISODate | null {
  const open = [...subscriptions].sort(oldestFirst).find((s) => subscriptionDue(s, payments) > 0);
  return open?.startDate ?? null;
}
