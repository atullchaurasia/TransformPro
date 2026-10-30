// Computed membership status (spec §6.1). The DB stores only the lifecycle state
// (active/frozen/cancelled/completed); upcoming/expiring/grace/expired come from dates.
import type { Freeze, ISODate, PlanCategory, Subscription } from '@/db/models';

import { daysBetween, isWithin } from './dates';

/** Matches the status tones in the theme and the `status.*` i18n keys. */
export type MembershipStatus = 'active' | 'expiring' | 'grace' | 'expired' | 'frozen' | 'upcoming' | 'noPlan';

export type StatusSubscription = Pick<
  Subscription,
  | 'id'
  | 'planNameSnapshot'
  | 'categorySnapshot'
  | 'startDate'
  | 'endDate'
  | 'status'
  | 'trainerId'
  | 'sessionsTotal'
  | 'sessionsUsed'
>;

export type StatusFreeze = Pick<Freeze, 'subscriptionId' | 'endedAt'>;

export type StatusSettings = { expiringSoonDays: number; gracePeriodDays: number };

export type StatusResult = {
  status: MembershipStatus;
  /** The subscription the status is about (current / frozen / upcoming / most recent). */
  subscription: StatusSubscription | null;
  /** Days remaining including today's remaining day: last day → 0. Null unless active/expiring/frozen. */
  daysLeft: number | null;
  /** Days since the last valid day. Null unless grace/expired. */
  daysSinceExpiry: number | null;
  /**
   * Last day of the current run of back-to-back subscriptions. A member who renewed early
   * isn't "expiring soon" — their cover continues into the renewal.
   */
  coveredUntil: ISODate | null;
  planName: string | null;
  sessionsLeft: number | null;
};

const EMPTY: StatusResult = {
  status: 'noPlan',
  subscription: null,
  daysLeft: null,
  daysSinceExpiry: null,
  coveredUntil: null,
  planName: null,
  sessionsLeft: null,
};

export function sessionsLeft(sub: Pick<Subscription, 'sessionsTotal' | 'sessionsUsed'>): number | null {
  return sub.sessionsTotal == null ? null : Math.max(0, sub.sessionsTotal - sub.sessionsUsed);
}

function isFrozen(sub: StatusSubscription, freezes: StatusFreeze[]): boolean {
  return sub.status === 'frozen' || freezes.some((f) => f.subscriptionId === sub.id && f.endedAt == null);
}

/** A session plan with every session used is finished even if its date window is still open. */
function isExhausted(sub: StatusSubscription): boolean {
  return sub.status === 'completed' || sessionsLeft(sub) === 0;
}

/** Follows renewals that start on or before the day after the previous end. */
function coverEnd(start: StatusSubscription, all: StatusSubscription[]): ISODate {
  let end = start.endDate;
  const later = all.filter((s) => s.endDate > end).sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const next of later) {
    if (daysBetween(end, next.startDate) > 1) break;
    if (next.endDate > end) end = next.endDate;
  }
  return end;
}

const byStartDesc = (a: StatusSubscription, b: StatusSubscription) =>
  b.startDate.localeCompare(a.startDate) || b.endDate.localeCompare(a.endDate);

/**
 * Status for one category of a member's subscriptions (§6.1). Memberships drive the main
 * badge; PT and services use the same rules and are shown separately on the profile.
 */
export function computeStatus(
  subscriptions: StatusSubscription[],
  freezes: StatusFreeze[],
  today: ISODate,
  settings: StatusSettings,
  category: PlanCategory = 'membership',
): StatusResult {
  const subs = subscriptions
    .filter((s) => s.categorySnapshot === category && s.status !== 'cancelled')
    .sort(byStartDesc);
  if (subs.length === 0) return EMPTY;

  const base = (sub: StatusSubscription) => ({
    subscription: sub,
    planName: sub.planNameSnapshot,
    sessionsLeft: sessionsLeft(sub),
  });

  // Frozen first: the end date is only pushed out on unfreeze, so a frozen subscription
  // can look "past its end" while the freeze is still open.
  const frozen = subs.find((s) => isFrozen(s, freezes));
  if (frozen) {
    return {
      ...base(frozen),
      status: 'frozen',
      daysLeft: Math.max(0, daysBetween(today, frozen.endDate)),
      daysSinceExpiry: null,
      coveredUntil: frozen.endDate,
    };
  }

  const usable = subs.filter((s) => !isExhausted(s));
  const current = usable.find((s) => isWithin(today, s.startDate, s.endDate));
  if (current) {
    const coveredUntil = coverEnd(current, usable);
    const daysLeft = daysBetween(today, coveredUntil);
    return {
      ...base(current),
      status: daysLeft <= settings.expiringSoonDays ? 'expiring' : 'active',
      daysLeft,
      daysSinceExpiry: null,
      coveredUntil,
    };
  }

  const upcoming = usable.filter((s) => s.startDate > today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (upcoming) {
    return { ...base(upcoming), status: 'upcoming', daysLeft: null, daysSinceExpiry: null, coveredUntil: null };
  }

  // Everything has ended (by date or by using up all sessions).
  const last = [...subs].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const endedOn = last.endDate < today ? last.endDate : today;
  const since = Math.max(0, daysBetween(endedOn, today));
  // A session plan that ran out of sessions has no date-based grace period.
  const inGrace = !isExhausted(last) && since <= settings.gracePeriodDays && since > 0;
  return {
    ...base(last),
    status: inGrace ? 'grace' : 'expired',
    daysLeft: null,
    daysSinceExpiry: since,
    coveredUntil: null,
  };
}

/** Grace is treated as active for check-in (§6.1). */
export function countsAsActive(status: MembershipStatus): boolean {
  return status === 'active' || status === 'expiring' || status === 'grace';
}

/**
 * The trainer shown for a member: the trainer on their current PT subscription, otherwise
 * the member's assigned trainer (§6.1 "current trainer").
 */
export function currentTrainerId(pt: StatusResult, assignedTrainerId: string | null): string | null {
  if (pt.subscription?.trainerId && (pt.status === 'active' || pt.status === 'expiring' || pt.status === 'frozen')) {
    return pt.subscription.trainerId;
  }
  return assignedTrainerId;
}

export type MemberStatusSummary = {
  membership: StatusResult;
  personalTraining: StatusResult;
  services: StatusResult;
  trainerId: string | null;
};

export function computeMemberStatus(
  subscriptions: StatusSubscription[],
  freezes: StatusFreeze[],
  today: ISODate,
  settings: StatusSettings,
  assignedTrainerId: string | null,
): MemberStatusSummary {
  const personalTraining = computeStatus(subscriptions, freezes, today, settings, 'personal_training');
  return {
    membership: computeStatus(subscriptions, freezes, today, settings, 'membership'),
    personalTraining,
    services: computeStatus(subscriptions, freezes, today, settings, 'service'),
    trainerId: currentTrainerId(personalTraining, assignedTrainerId),
  };
}
