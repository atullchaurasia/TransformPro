// Subscription lifecycle on the member profile (spec §10.2 Plans tab, §6.3–6.4): per-plan
// state, progress, change-plan proration, extend / cancel / edit checks, unfreeze maths.
import type { Freeze, ISODate, Paise, PlanCategory, Subscription } from '@/db/models';

import { addDaysISO, daysBetween } from './dates';
import { freezeToDate, frozenDaysOnEnd } from './freeze';
import { sessionsLeft } from './membershipStatus';

/** State of ONE subscription in the Plans timeline (the member badge uses computeStatus). */
export type SubscriptionState = 'active' | 'expiring' | 'frozen' | 'upcoming' | 'expired' | 'completed' | 'cancelled';

export type LifecycleSubscription = Pick<
  Subscription,
  'id' | 'categorySnapshot' | 'startDate' | 'endDate' | 'status' | 'sessionsTotal' | 'sessionsUsed' | 'totalPaise'
>;

export function subscriptionState(
  sub: LifecycleSubscription,
  opts: { openFreeze: boolean; renewed: boolean; today: ISODate; expiringSoonDays: number },
): SubscriptionState {
  if (sub.status === 'cancelled') return 'cancelled';
  if (sub.status === 'frozen' || opts.openFreeze) return 'frozen';
  if (sub.status === 'completed' || sessionsLeft(sub) === 0) return 'completed';
  if (sub.startDate > opts.today) return 'upcoming';
  if (sub.endDate < opts.today) return 'expired';
  // Already renewed → its cover continues, so it isn't "expiring".
  if (!opts.renewed && daysBetween(opts.today, sub.endDate) <= opts.expiringSoonDays) return 'expiring';
  return 'active';
}

/** Share of the plan already used (0..1) for the days-left progress bar. */
export function subscriptionProgress(sub: Pick<Subscription, 'startDate' | 'endDate'>, today: ISODate): number {
  const total = daysBetween(sub.startDate, sub.endDate) + 1;
  if (total <= 0) return 1;
  const used = Math.min(total, Math.max(0, daysBetween(sub.startDate, today) + 1));
  return used / total;
}

/** The subscription a "Renew" acts on: the one of this category that ends last. */
export function renewalTarget<S extends Pick<Subscription, 'categorySnapshot' | 'status' | 'endDate' | 'startDate'>>(
  subs: S[],
  category: PlanCategory = 'membership',
): S | null {
  const live = subs.filter((s) => s.categorySnapshot === category && s.status !== 'cancelled');
  live.sort((a, b) => b.endDate.localeCompare(a.endDate) || b.startDate.localeCompare(a.startDate));
  return live[0] ?? null;
}

// ---- Change plan (upgrade with proration suggestion) ----

export type ChangePlanBlock = 'not_current' | 'frozen' | 'starts_today' | 'not_started' | 'ended';

/**
 * A plan can be changed while it is running: the old one ends yesterday and the new one
 * starts today. Plans that start today or later are simply edited instead; ended plans are renewed.
 */
export function checkChangePlan(
  sub: LifecycleSubscription,
  today: ISODate,
  openFreeze: boolean,
): { ok: true; oldEndDate: ISODate; newStartDate: ISODate } | { ok: false; reason: ChangePlanBlock } {
  if (sub.status === 'cancelled' || sub.status === 'completed' || sessionsLeft(sub) === 0) return { ok: false, reason: 'not_current' };
  if (sub.status === 'frozen' || openFreeze) return { ok: false, reason: 'frozen' };
  if (sub.startDate === today) return { ok: false, reason: 'starts_today' };
  if (sub.startDate > today) return { ok: false, reason: 'not_started' };
  if (sub.endDate < today) return { ok: false, reason: 'ended' };
  return { ok: true, oldEndDate: addDaysISO(today, -1), newStartDate: today };
}

export type Proration = {
  /** Days from the change date to the old end date, inclusive (date plans). */
  unusedDays: number;
  totalDays: number;
  /** Session plans: sessions not used yet. */
  unusedSessions: number | null;
  /** Suggested credit = unused share of the old plan's total. */
  creditPaise: Paise;
};

/**
 * Proration suggestion (§10.2 "upgrade: prorate shown as suggestion"). The credit is the
 * unused share of the old plan's TOTAL — the old subscription keeps its own due, so across
 * both plans the member pays for the days they used plus the new plan (Decisions Log M07).
 */
export function prorationCredit(sub: LifecycleSubscription, changeDate: ISODate): Proration {
  const totalDays = daysBetween(sub.startDate, sub.endDate) + 1;
  const unusedDays = Math.max(0, Math.min(totalDays, daysBetween(changeDate, sub.endDate) + 1));
  const left = sessionsLeft(sub);
  const share = sub.sessionsTotal ? (left ?? 0) / sub.sessionsTotal : totalDays > 0 ? unusedDays / totalDays : 0;
  return { unusedDays, totalDays, unusedSessions: left, creditPaise: Math.max(0, Math.round(sub.totalPaise * share)) };
}

// ---- Extend / cancel / edit ----

export type ExtendError = 'not_later' | 'reason_required';

export function validateExtension(currentEnd: ISODate, newEnd: ISODate | null, reason: string): ExtendError | null {
  if (!newEnd || newEnd <= currentEnd) return 'not_later';
  if (!reason.trim()) return 'reason_required';
  return null;
}

export type CancelError = 'reason_required' | 'invalid_refund' | 'refund_too_large';

/** Cancel needs a reason; the refund can't be more than what was actually paid on the plan. */
export function validateCancel(reason: string, refundPaise: Paise, maxRefundablePaise: Paise): CancelError | null {
  if (!reason.trim()) return 'reason_required';
  if (!Number.isSafeInteger(refundPaise) || refundPaise < 0) return 'invalid_refund';
  if (refundPaise > maxRefundablePaise) return 'refund_too_large';
  return null;
}

/** Editing a plan's price can't take the total below what's already been paid on it. */
export function validateSubscriptionEdit(newTotalPaise: Paise, netPaidPaise: Paise): 'below_paid' | null {
  return newTotalPaise < netPaidPaise ? 'below_paid' : null;
}

// ---- Which actions a plan offers ----

export type PlanAction = 'renew' | 'freeze' | 'unfreeze' | 'extend' | 'changePlan' | 'cancel' | 'edit' | 'delete';

export type PlanActionAccess = {
  renew: boolean;
  freeze: boolean;
  editDates: boolean;
  create: boolean;
  cancel: boolean;
  /** Deleting a plan is owner-only (§10.2). */
  owner: boolean;
};

/**
 * Actions for one plan in the timeline. UI the user can't use is hidden (§15): each action
 * needs its permission and must make sense for the plan's state.
 */
export function planActionsFor(
  row: { state: SubscriptionState; category: PlanCategory; isLatestOfCategory: boolean; hasOpenFreeze: boolean; canChangePlan: boolean; paymentRows: number },
  access: PlanActionAccess,
): PlanAction[] {
  const open = row.state !== 'cancelled';
  const out: PlanAction[] = [];
  if (access.renew && open && row.isLatestOfCategory) out.push('renew');
  // One-time services aren't frozen; a plan is frozen once at a time.
  if (access.freeze && row.category !== 'service') {
    if (row.hasOpenFreeze) out.push('unfreeze');
    else if (row.state === 'active' || row.state === 'expiring') out.push('freeze');
  }
  if (access.editDates && open) out.push('extend');
  if (access.create && row.canChangePlan) out.push('changePlan');
  if (access.editDates && open) out.push('edit');
  if (access.cancel && open) out.push('cancel');
  if (access.owner && row.paymentRows === 0) out.push('delete');
  return out;
}

// ---- Unfreeze ----

export type UnfreezeOutcome = {
  /** Days added to the end date. */
  days: number;
  /** Last frozen day, for the freeze history (null when nothing was frozen). */
  toDate: ISODate | null;
  /** True when an open-ended freeze ran past the plan's limit and only the allowed days count. */
  capped: boolean;
};

/**
 * Ending a freeze on `endedOn` (the day the member is back). Open-ended freezes are checked
 * against the plan limit only now (§6.4); without `membership.freeze_override` only the
 * remaining allowed days are added.
 */
export function unfreezeOutcome(
  freeze: Pick<Freeze, 'fromDate' | 'days'>,
  endedOn: ISODate,
  remainingDays: number | null,
  canOverride: boolean,
): UnfreezeOutcome {
  let days = frozenDaysOnEnd(freeze, endedOn);
  let capped = false;
  if (freeze.days == null && remainingDays != null && days > remainingDays && !canOverride) {
    days = remainingDays;
    capped = true;
  }
  return { days, toDate: days > 0 ? freezeToDate(freeze.fromDate, days) : null, capped };
}
