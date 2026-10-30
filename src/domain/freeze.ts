// Membership freeze rules (spec §6.4).
import type { ISODate } from '@/db/models';

import { addDaysISO, daysBetween, isWithin } from './dates';

/**
 * Plan limits. 0 means "no limit" — every seeded plan starts at 0, and the plan form
 * explains it (Decisions Log 2026-10-30 M03).
 */
export type FreezeLimits = { maxFreezeDays: number; maxFreezeTimes: number };

export type FreezeHistory = {
  /** Freezes already taken on this subscription (open or closed). */
  timesUsed: number;
  /** Days already frozen on this subscription (`frozen_days_total`). */
  daysUsed: number;
};

export type FreezeRequest = {
  fromDate: ISODate;
  /** Null = open-ended until "Unfreeze". */
  days: number | null;
  subscription: { startDate: ISODate; endDate: ISODate; status: string };
};

export type FreezeViolation = 'max_times' | 'max_days' | 'already_frozen' | 'outside_subscription' | 'invalid_days';

export type FreezeCheck = {
  /** Can go ahead now (no violations, or only overridable ones and the user may override). */
  allowed: boolean;
  violations: FreezeViolation[];
  /** True when every violation is a plan limit that `membership.freeze_override` can bypass. */
  overridable: boolean;
  /** Days still allowed by the plan; null when unlimited. */
  remainingDays: number | null;
};

const LIMIT_VIOLATIONS: FreezeViolation[] = ['max_times', 'max_days'];

export function remainingFreezeDays(limits: FreezeLimits, history: FreezeHistory): number | null {
  return limits.maxFreezeDays > 0 ? Math.max(0, limits.maxFreezeDays - history.daysUsed) : null;
}

export function checkFreeze(
  request: FreezeRequest,
  limits: FreezeLimits,
  history: FreezeHistory,
  canOverride: boolean,
): FreezeCheck {
  const violations: FreezeViolation[] = [];
  const { subscription: sub } = request;

  if (sub.status === 'frozen') violations.push('already_frozen');
  if (!isWithin(request.fromDate, sub.startDate, sub.endDate)) violations.push('outside_subscription');
  if (request.days != null && (!Number.isInteger(request.days) || request.days < 1)) violations.push('invalid_days');

  if (limits.maxFreezeTimes > 0 && history.timesUsed >= limits.maxFreezeTimes) violations.push('max_times');
  const remainingDays = remainingFreezeDays(limits, history);
  if (remainingDays != null) {
    // An open-ended freeze is only checked for "any days left"; the cap is re-checked on unfreeze.
    const asked = request.days ?? 1;
    if (asked > remainingDays) violations.push('max_days');
  }

  const overridable = violations.length > 0 && violations.every((v) => LIMIT_VIOLATIONS.includes(v));
  return {
    allowed: violations.length === 0 || (overridable && canOverride),
    violations,
    overridable,
    remainingDays,
  };
}

/** Last frozen day of a fixed-length freeze. */
export function freezeToDate(fromDate: ISODate, days: number): ISODate {
  return addDaysISO(fromDate, days - 1);
}

/**
 * Days actually frozen when a freeze ends on `endedOn` (the day the member is back).
 * Fixed freezes never count more than they asked for; ending early counts only days used.
 */
export function frozenDaysOnEnd(freeze: { fromDate: ISODate; days: number | null }, endedOn: ISODate): number {
  const elapsed = Math.max(0, daysBetween(freeze.fromDate, endedOn));
  return freeze.days == null ? elapsed : Math.min(freeze.days, elapsed);
}

/** A fixed freeze ends by itself once its last day has passed. */
export function isFreezeOver(freeze: { toDate: ISODate | null; endedAt: string | null }, today: ISODate): boolean {
  return freeze.endedAt == null && freeze.toDate != null && freeze.toDate < today;
}

/** The subscription update on unfreeze: end_date += days, frozen_days_total += days (§6.4). */
export function applyUnfreeze(
  sub: { endDate: ISODate; frozenDaysTotal: number },
  days: number,
): { endDate: ISODate; frozenDaysTotal: number; status: 'active' } {
  return {
    endDate: addDaysISO(sub.endDate, days),
    frozenDaysTotal: sub.frozenDaysTotal + days,
    status: 'active',
  };
}
