// Everything the member profile shows, computed from the member's rows (spec §10.2 profile).
import type { Freeze, ISODate, Paise, Payment, Subscription } from '@/db/models';

import { memberDues, netPaid, subscriptionDue, type MemberDues } from './dues';
import { subscriptionProgress, subscriptionState, type SubscriptionState } from './lifecycle';
import { computeMemberStatus, type MemberStatusSummary, type StatusSettings } from './membershipStatus';

export type ProfilePayment = Pick<Payment, 'id' | 'subscriptionId' | 'amountPaise' | 'isRefund' | 'deletedAt' | 'paidOn' | 'createdAt'>;

export type SubscriptionRow = {
  sub: Subscription;
  state: SubscriptionState;
  netPaidPaise: Paise;
  duePaise: Paise;
  openFreeze: Freeze | null;
  /** Freezes taken on this plan (open or closed) — for the plan's `max_freeze_times`. */
  freezeCount: number;
  /** Payment rows linked to it, including deleted ones (a plan with payments can't be deleted). */
  paymentRows: number;
  progress: number;
};

export type MemberProfileSummary = {
  status: MemberStatusSummary;
  dues: MemberDues;
  /** Everything paid minus refunds, advances included. */
  lifetimePaidPaise: Paise;
  /** Newest first (timeline). */
  rows: SubscriptionRow[];
  /** Services running now. */
  currentServices: SubscriptionRow[];
};

export function buildMemberProfile(input: {
  assignedTrainerId: string | null;
  subscriptions: Subscription[];
  freezes: Freeze[];
  payments: ProfilePayment[];
  today: ISODate;
  settings: StatusSettings;
}): MemberProfileSummary {
  const { subscriptions, freezes, payments, today, settings } = input;
  const live = payments.filter((p) => p.deletedAt == null);
  const renewedIds = new Set(subscriptions.map((s) => s.renewedFromSubscriptionId).filter(Boolean));

  const rows = [...subscriptions]
    .sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt))
    .map((sub): SubscriptionRow => {
      const openFreeze = freezes.find((f) => f.subscriptionId === sub.id && f.endedAt == null) ?? null;
      return {
        sub,
        state: subscriptionState(sub, { openFreeze: !!openFreeze, renewed: renewedIds.has(sub.id), today, expiringSoonDays: settings.expiringSoonDays }),
        netPaidPaise: netPaid(sub.id, live),
        duePaise: subscriptionDue(sub, live),
        openFreeze,
        freezeCount: freezes.filter((f) => f.subscriptionId === sub.id).length,
        paymentRows: payments.filter((p) => p.subscriptionId === sub.id).length,
        progress: subscriptionProgress(sub, today),
      };
    });

  return {
    status: computeMemberStatus(subscriptions, freezes, today, settings, input.assignedTrainerId),
    dues: memberDues(subscriptions, live),
    lifetimePaidPaise: live.reduce((sum, p) => sum + (p.isRefund ? -p.amountPaise : p.amountPaise), 0),
    rows,
    currentServices: rows.filter((r) => r.sub.categorySnapshot === 'service' && (r.state === 'active' || r.state === 'expiring' || r.state === 'frozen')),
  };
}
