// Check-in evaluator and auto check-out (spec §6.8, §10.4).
import { addHours, differenceInMinutes, parseISO } from 'date-fns';

import type { Attendance, ISOTimestamp, Paise } from '@/db/models';

import { countsAsActive, type MembershipStatus, type StatusResult } from './membershipStatus';

export type CheckinSettings = {
  blockExpired: boolean;
  blockDues: boolean;
  allowMultiplePerDay: boolean;
};

export type BlockReason = 'expired' | 'no_plan' | 'upcoming' | 'frozen' | 'dues' | 'no_sessions_left' | 'already_checked_in';
export type WarningReason = 'expiring' | 'grace' | 'dues';

export type TodayVisit = Pick<Attendance, 'id' | 'checkInAt' | 'checkOutAt'>;

export type CheckinInput = {
  membership: StatusResult;
  duePaise: Paise;
  /** This member's attendance rows for today. */
  todayVisits: TodayVisit[];
  settings: CheckinSettings;
  /** Staff has `attendance.override_block`. */
  canOverride: boolean;
};

export type CheckinDecision =
  /** Already inside today → the UI offers Check out. */
  | { kind: 'check_out'; visitId: string }
  | {
      kind: 'check_in';
      warnings: WarningReason[];
      /** Subscription whose `sessions_used` goes up by one, for session plans. */
      consumeSessionOf: string | null;
    }
  | {
      kind: 'blocked';
      reasons: BlockReason[];
      warnings: WarningReason[];
      /** Owner/manager can override with a reason (audit logged, §6.8). */
      overridable: boolean;
      consumeSessionOf: string | null;
    };

const statusBlocks: Partial<Record<MembershipStatus, BlockReason>> = {
  expired: 'expired',
  noPlan: 'no_plan',
  upcoming: 'upcoming',
};

export function evaluateCheckin(input: CheckinInput): CheckinDecision {
  const { membership, settings, todayVisits } = input;

  const open = todayVisits.find((v) => v.checkOutAt == null);
  if (open) return { kind: 'check_out', visitId: open.id };

  const reasons: BlockReason[] = [];
  const warnings: WarningReason[] = [];

  if (todayVisits.length > 0 && !settings.allowMultiplePerDay) reasons.push('already_checked_in');

  // Frozen members can never just walk in (§6.4); expired/no plan/not started only when the
  // gym turned on `checkin_block_expired`. Grace counts as active (§6.1) but is flagged.
  if (membership.status === 'frozen') reasons.push('frozen');
  const statusBlock = statusBlocks[membership.status];
  if (statusBlock && settings.blockExpired) reasons.push(statusBlock);
  if (membership.status === 'expiring') warnings.push('expiring');
  if (membership.status === 'grace') warnings.push('grace');

  if (input.duePaise > 0) {
    if (settings.blockDues) reasons.push('dues');
    else warnings.push('dues');
  }

  let consumeSessionOf: string | null = null;
  const sub = membership.subscription;
  if (sub && sub.sessionsTotal != null) {
    // Used-up session plans block regardless of `checkin_block_expired` (§6.8).
    if ((membership.sessionsLeft ?? 0) <= 0) reasons.push('no_sessions_left');
    else if (countsAsActive(membership.status)) consumeSessionOf = sub.id;
  }

  if (reasons.length === 0) return { kind: 'check_in', warnings, consumeSessionOf };
  // Even an override can't use a session that doesn't exist.
  return {
    kind: 'blocked',
    reasons,
    warnings,
    overridable: input.canOverride,
    consumeSessionOf: reasons.includes('no_sessions_left') ? null : consumeSessionOf,
  };
}

/**
 * Open check-ins older than `auto_checkout_hours` (§6.8), closed when the app opens.
 * The check-out time is set to check-in + hours — closer to the truth than "now".
 */
export function staleCheckins(
  open: Pick<Attendance, 'id' | 'checkInAt' | 'checkOutAt'>[],
  now: Date,
  hours: number,
): { id: string; checkOutAt: ISOTimestamp }[] {
  if (!(hours > 0)) return [];
  return open
    .filter((v) => v.checkOutAt == null && differenceInMinutes(now, parseISO(v.checkInAt)) >= hours * 60)
    .map((v) => ({ id: v.id, checkOutAt: addHours(parseISO(v.checkInAt), hours).toISOString() }));
}
