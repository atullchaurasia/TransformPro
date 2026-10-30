// Subscription lifecycle writes (spec §10.2 Plans tab, §6.3–6.4). Each function runs inside
// the caller's ONE transaction and writes its audit entry with the same `tx`.
import { applyUnfreeze, freezeToDate } from '@/domain/freeze';
import { formatPaise } from '@/domain/money';
import type { PaymentPlan, SubscriptionDraft } from '@/domain/newMember';
import { nowIso } from '@/utils/id';

import type { Freeze, ISODate, Member, Payment, RowPatch, Subscription } from '../models';
import type { Db } from '../types';

import { writeAudit } from './audit';
import { freezesRepo, subscriptionsRepo } from './index';
import { applyAdvances, countSubscriptionPayments, insertPayment, recordPlanPayments, type PaymentDetails } from './payments';

type LifecycleMember = Pick<Member, 'id' | 'fullName' | 'branchId'>;

const audit = (tx: Db, action: string, sub: Pick<Subscription, 'id'>, summary: string, staffId?: string | null) =>
  writeAudit(tx, { action, entity: 'subscription', entityId: sub.id, summary, ...(staffId !== undefined ? { staffId } : {}) });

export type AddSubscriptionInput = {
  member: LifecycleMember;
  draft: Omit<SubscriptionDraft, 'price'>;
  /** Renewal / plan change: the subscription this one follows (§6.3). */
  renewedFromSubscriptionId: string | null;
  payment: (PaymentDetails & { plan: PaymentPlan }) | null;
  createdBy: string | null;
  currency: string;
  kind: 'renew' | 'create' | 'change_plan';
};

export type AddSubscriptionResult = { subscription: Subscription; payments: Payment[]; advanceAppliedPaise: number };

/** Renew / add a plan: subscription + linked advances + payment(s) + audit. */
export async function addSubscription(tx: Db, input: AddSubscriptionInput): Promise<AddSubscriptionResult> {
  const { member, currency } = input;
  const subscription = await subscriptionsRepo.create(tx, {
    ...input.draft,
    renewedFromSubscriptionId: input.renewedFromSubscriptionId,
    memberId: member.id,
    branchId: member.branchId,
    cancelledReason: null,
    cancelledAt: null,
    refundPaise: null,
    createdBy: input.createdBy,
  });
  const verb = input.kind === 'renew' ? 'Renewed' : input.kind === 'change_plan' ? 'Changed to' : 'Added';
  await audit(
    tx,
    input.kind === 'renew' ? 'subscription.renew' : 'subscription.create',
    subscription,
    `${member.fullName}: ${verb} ${subscription.planNameSnapshot} ${subscription.startDate} → ${subscription.endDate}, ${formatPaise(subscription.totalPaise, currency)}`,
  );
  // Advances first, so "paid now" (computed with the advance deducted) lands on what's left.
  const advanceAppliedPaise = await applyAdvances(tx, member, subscription, currency);
  const payments = input.payment
    ? await recordPlanPayments(tx, { member, subscriptions: [subscription], plan: input.payment.plan, details: input.payment, receivedBy: input.createdBy, currency })
    : [];
  return { subscription, payments, advanceAppliedPaise };
}

/** Change plan: the old plan ends on `oldEndDate` (completed) and the new one starts. */
export async function changePlan(tx: Db, old: Subscription, oldEndDate: ISODate, input: Omit<AddSubscriptionInput, 'kind' | 'renewedFromSubscriptionId'>): Promise<AddSubscriptionResult> {
  await subscriptionsRepo.update(tx, old.id, { endDate: oldEndDate, status: 'completed' });
  await audit(tx, 'subscription.change_plan', old, `${input.member.fullName}: ${old.planNameSnapshot} ended ${oldEndDate} (changed to ${input.draft.planNameSnapshot})`);
  return addSubscription(tx, { ...input, renewedFromSubscriptionId: old.id, kind: 'change_plan' });
}

// ---- Freeze (§6.4) ----

export async function freezeSubscription(
  tx: Db,
  input: { member: LifecycleMember; sub: Subscription; fromDate: ISODate; days: number | null; reason: string | null; overridden: boolean; createdBy: string | null },
): Promise<Freeze> {
  const { sub, fromDate, days } = input;
  const freeze = await freezesRepo.create(tx, {
    subscriptionId: sub.id,
    memberId: input.member.id,
    fromDate,
    toDate: days == null ? null : freezeToDate(fromDate, days),
    days,
    reason: input.reason,
    createdBy: input.createdBy,
    endedAt: null,
  });
  await subscriptionsRepo.update(tx, sub.id, { status: 'frozen' });
  const length = days == null ? 'until unfrozen' : `for ${days} day(s)`;
  await audit(tx, 'subscription.freeze', sub, `${input.member.fullName}: froze ${sub.planNameSnapshot} from ${fromDate} ${length}${input.overridden ? ' (plan limit overridden)' : ''}${input.reason ? `: ${input.reason}` : ''}`);
  return freeze;
}

/** Unfreeze / freeze end: end_date += days, frozen_days_total += days (§6.4). */
export async function endFreeze(
  tx: Db,
  input: { member: Pick<Member, 'fullName'>; sub: Subscription; freeze: Freeze; days: number; toDate: ISODate | null; note?: string; staffId?: string | null },
): Promise<Subscription> {
  const { sub, freeze, days } = input;
  await freezesRepo.update(tx, freeze.id, { endedAt: nowIso(), days, toDate: input.toDate });
  const updated = await subscriptionsRepo.update(tx, sub.id, applyUnfreeze(sub, days));
  await audit(
    tx,
    'subscription.unfreeze',
    sub,
    `${input.member.fullName}: unfroze ${sub.planNameSnapshot} after ${days} day(s); ends ${sub.endDate} → ${updated.endDate}${input.note ? ` (${input.note})` : ''}`,
    input.staffId,
  );
  return updated;
}

/**
 * Fixed-length freezes whose last day has passed end by themselves (on profile load and at
 * start-up), extending the plan by the full frozen days. Returns how many were closed.
 */
export async function closeFinishedFreezes(tx: Db, today: ISODate): Promise<number> {
  const rows = await tx.getAllAsync<Record<string, unknown>>(
    `SELECT f.*, m.full_name AS member_name FROM freezes f JOIN members m ON m.id = f.member_id
     WHERE f.ended_at IS NULL AND f.to_date IS NOT NULL AND f.to_date < ?`,
    [today],
  );
  for (const row of rows) {
    const freeze = freezesRepo.fromRow(row);
    const sub = await subscriptionsRepo.getById(tx, freeze.subscriptionId);
    if (!sub || freeze.days == null) continue;
    await endFreeze(tx, { member: { fullName: String(row.member_name) }, sub, freeze, days: freeze.days, toDate: freeze.toDate, note: 'freeze period over', staffId: null });
  }
  return rows.length;
}

export async function countFinishedFreezes(db: Db, today: ISODate): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM freezes WHERE ended_at IS NULL AND to_date IS NOT NULL AND to_date < ?', [today]);
  return row?.n ?? 0;
}

// ---- Extend / cancel / edit / delete ----

export async function extendSubscription(tx: Db, input: { member: Pick<Member, 'fullName'>; sub: Subscription; newEndDate: ISODate; reason: string }): Promise<Subscription> {
  const { sub } = input;
  const updated = await subscriptionsRepo.update(tx, sub.id, { endDate: input.newEndDate });
  await audit(tx, 'subscription.extend', sub, `${input.member.fullName}: extended ${sub.planNameSnapshot} ${sub.endDate} → ${input.newEndDate}: ${input.reason.trim()}`);
  return updated;
}

export async function cancelSubscription(
  tx: Db,
  input: {
    member: LifecycleMember;
    sub: Subscription;
    reason: string;
    refund: { amountPaise: number; details: PaymentDetails } | null;
    receivedBy: string | null;
    currency: string;
  },
): Promise<{ subscription: Subscription; refund: Payment | null }> {
  const { sub, member, currency } = input;
  // An open freeze ends with the plan (no extension — the plan is over).
  await tx.runAsync('UPDATE freezes SET ended_at = ?, updated_at = ? WHERE subscription_id = ? AND ended_at IS NULL', [nowIso(), nowIso(), sub.id]);
  const refundPaise = input.refund?.amountPaise ?? 0;
  const subscription = await subscriptionsRepo.update(tx, sub.id, {
    status: 'cancelled',
    cancelledReason: input.reason.trim(),
    cancelledAt: nowIso(),
    refundPaise: refundPaise > 0 ? refundPaise : null,
  });
  await audit(tx, 'subscription.cancel', sub, `${member.fullName}: cancelled ${sub.planNameSnapshot}${refundPaise > 0 ? `, refund ${formatPaise(refundPaise, currency)}` : ''}: ${input.reason.trim()}`);
  const refund =
    input.refund && refundPaise > 0
      ? await insertPayment(tx, { member, subscription: sub, amountPaise: refundPaise, details: input.refund.details, receivedBy: input.receivedBy, isRefund: true, currency })
      : null;
  return { subscription, refund };
}

export type SubscriptionEdit = RowPatch<Pick<Subscription, 'startDate' | 'endDate' | 'trainerId' | 'basePricePaise' | 'admissionFeePaise' | 'discountPaise' | 'discountReason' | 'taxPaise' | 'totalPaise'>>;

export async function updateSubscription(tx: Db, input: { member: Pick<Member, 'fullName'>; sub: Subscription; patch: SubscriptionEdit; currency: string }): Promise<Subscription> {
  const { sub } = input;
  const updated = await subscriptionsRepo.update(tx, sub.id, input.patch);
  await audit(
    tx,
    'subscription.update',
    sub,
    `${input.member.fullName}: edited ${sub.planNameSnapshot} — ${updated.startDate} → ${updated.endDate}, ${formatPaise(updated.totalPaise, input.currency)}`,
  );
  return updated;
}

export class SubscriptionHasPaymentsError extends Error {
  constructor() {
    super('This plan has payments and cannot be deleted');
  }
}

/** Owner-only delete, and only when no payment row points at the plan (§10.2). */
export async function deleteSubscription(tx: Db, input: { member: Pick<Member, 'fullName'>; sub: Subscription }): Promise<void> {
  const { sub } = input;
  if ((await countSubscriptionPayments(tx, sub.id)) > 0) throw new SubscriptionHasPaymentsError();
  await subscriptionsRepo.hardDelete(tx, sub.id);
  await audit(tx, 'subscription.delete', sub, `${input.member.fullName}: deleted ${sub.planNameSnapshot} ${sub.startDate} → ${sub.endDate}`);
}
