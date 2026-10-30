// Member profile reads/writes (§10.2 profile, §6.3–6.4). Screens → these → repositories.
// Every write is one transaction with audit entries; writeTransaction bumps dataVersion.
import { endOfMonth, startOfMonth } from 'date-fns';

import { getDb, writeTransaction } from '@/db/client';
import type { Freeze, Member, Subscription } from '@/db/models';
import { listMemberAudit, loadMemberProfileData } from '@/db/repositories/memberProfile';
import {
  addSubscription,
  cancelSubscription,
  changePlan,
  closeFinishedFreezes,
  countFinishedFreezes,
  deleteSubscription,
  endFreeze,
  extendSubscription,
  freezeSubscription,
  updateSubscription,
  type AddSubscriptionInput,
  type SubscriptionEdit,
} from '@/db/repositories/subscriptions';
import { formatDay, todayISO } from '@/domain/dates';
import type { UnfreezeOutcome } from '@/domain/lifecycle';
import { buildMemberProfile } from '@/domain/memberProfile';
import type { PaymentDetails } from '@/db/repositories/payments';
import { getCurrentStaffId } from '@/store/sessionStore';
import { getSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

/** Ends fixed freezes whose last day has passed (§6.4). Never throws — a failure must not block the screen. */
export async function closeFinishedFreezesSafely(today = todayISO()): Promise<number> {
  try {
    if ((await countFinishedFreezes(getDb(), today)) === 0) return 0;
    return await writeTransaction((tx) => closeFinishedFreezes(tx, today));
  } catch (e) {
    logger.error('Closing finished freezes failed', e);
    return 0;
  }
}

export async function loadProfile(memberId: string) {
  const now = new Date();
  const today = todayISO(now);
  await closeFinishedFreezesSafely(today);
  const data = await loadMemberProfileData(getDb(), memberId, { from: formatDay(startOfMonth(now)), to: formatDay(endOfMonth(now)) });
  if (!data) return null;
  const s = getSettings();
  const summary = buildMemberProfile({
    assignedTrainerId: data.member.assignedTrainerId,
    subscriptions: data.subscriptions,
    freezes: data.freezes,
    payments: data.payments,
    today,
    settings: { expiringSoonDays: s.expiring_soon_days, gracePeriodDays: s.grace_period_days },
  });
  return { ...data, summary, today };
}

export type LoadedProfile = NonNullable<Awaited<ReturnType<typeof loadProfile>>>;

export const loadMemberHistory = (memberId: string) => listMemberAudit(getDb(), memberId);

type Who = Pick<Member, 'id' | 'fullName' | 'branchId'>;
const currency = () => getSettings().currency_code;

export function saveNewSubscription(input: Omit<AddSubscriptionInput, 'createdBy' | 'currency'>) {
  return writeTransaction((tx) => addSubscription(tx, { ...input, createdBy: getCurrentStaffId(), currency: currency() }));
}

export function saveChangePlan(old: Subscription, oldEndDate: string, input: Omit<AddSubscriptionInput, 'createdBy' | 'currency' | 'kind' | 'renewedFromSubscriptionId'>) {
  return writeTransaction((tx) => changePlan(tx, old, oldEndDate, { ...input, createdBy: getCurrentStaffId(), currency: currency() }));
}

export function freeze(member: Who, sub: Subscription, input: { fromDate: string; days: number | null; reason: string; overridden: boolean }) {
  return writeTransaction((tx) =>
    freezeSubscription(tx, { member, sub, fromDate: input.fromDate, days: input.days, reason: input.reason.trim() || null, overridden: input.overridden, createdBy: getCurrentStaffId() }),
  );
}

export function unfreeze(member: Who, sub: Subscription, openFreeze: Freeze, outcome: UnfreezeOutcome) {
  return writeTransaction((tx) =>
    endFreeze(tx, { member, sub, freeze: openFreeze, days: outcome.days, toDate: outcome.toDate, note: outcome.capped ? 'capped at the plan freeze limit' : undefined }),
  );
}

export function extend(member: Who, sub: Subscription, newEndDate: string, reason: string) {
  return writeTransaction((tx) => extendSubscription(tx, { member, sub, newEndDate, reason }));
}

export function cancel(member: Who, sub: Subscription, reason: string, refund: { amountPaise: number; details: PaymentDetails } | null) {
  return writeTransaction((tx) => cancelSubscription(tx, { member, sub, reason, refund, receivedBy: getCurrentStaffId(), currency: currency() }));
}

export function editSubscription(member: Who, sub: Subscription, patch: SubscriptionEdit) {
  return writeTransaction((tx) => updateSubscription(tx, { member, sub, patch, currency: currency() }));
}

export function removeSubscription(member: Who, sub: Subscription) {
  return writeTransaction((tx) => deleteSubscription(tx, { member, sub }));
}
