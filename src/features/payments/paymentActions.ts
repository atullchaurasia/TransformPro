// Payments reads/writes for screens (§10.5). Screens → these → repositories; every write is one
// transaction with audit entries, and writeTransaction bumps dataVersion so lists refresh.
import { subDays } from 'date-fns';

import { getDb, writeTransaction } from '@/db/client';
import type { Member, Subscription } from '@/db/models';
import { loadMemberListData } from '@/db/repositories/members';
import {
  listMemberPaymentRows,
  listPaymentsInRange,
  listPurgeablePayments,
  listTrashedPayments,
  type PaymentListRow,
} from '@/db/repositories/paymentList';
import { deletePaymentPermanently, recordPayment, recordRefund, restorePayment, softDeletePayment, type PaymentDetails } from '@/db/repositories/payments';
import { buildDuesList, type DayRange, type DuesSort } from '@/domain/collections';
import { todayISO } from '@/domain/dates';
import { buildMemberSummaries } from '@/domain/memberList';
import { TRASH_RETENTION_DAYS } from '@/features/members/memberActions';
import { getCurrentStaffId } from '@/store/sessionStore';
import { getSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

export const loadCollections = (range: DayRange, kind: 'payments' | 'refunds') => listPaymentsInRange(getDb(), range, kind);
export const loadMemberPayments = (memberId: string) => listMemberPaymentRows(getDb(), memberId);
export const loadTrashedPayments = () => listTrashedPayments(getDb());

/** Members with a balance (§10.5 Dues), from the same bulk queries as the members list. */
export async function loadDues(sort: DuesSort) {
  const data = await loadMemberListData(getDb());
  const s = getSettings();
  const summaries = buildMemberSummaries({ ...data, today: todayISO(), settings: { expiringSoonDays: s.expiring_soon_days, gracePeriodDays: s.grace_period_days } });
  return buildDuesList(summaries, data.subscriptions, data.netPaidBySubscription, sort);
}

type Who = Pick<Member, 'id' | 'fullName' | 'branchId'>;
const currency = () => getSettings().currency_code;

export function savePayment(member: Who, allocations: { subscriptionId: string | null; amountPaise: number }[], subscriptions: Pick<Subscription, 'id' | 'planNameSnapshot'>[], details: PaymentDetails) {
  return writeTransaction((tx) => recordPayment(tx, { member, allocations, subscriptions, details, receivedBy: getCurrentStaffId(), currency: currency() }));
}

export function saveRefund(member: Who, subscription: Pick<Subscription, 'id' | 'planNameSnapshot'> | null, amountPaise: number, details: PaymentDetails) {
  return writeTransaction((tx) => recordRefund(tx, { member, subscription, amountPaise, details, receivedBy: getCurrentStaffId(), currency: currency() }));
}

export function deletePayment(p: PaymentListRow) {
  return writeTransaction((tx) => softDeletePayment(tx, p, p.memberName, currency()));
}

export function restoreTrashedPayment(p: PaymentListRow) {
  return writeTransaction((tx) => restorePayment(tx, p, p.memberName));
}

export function deletePaymentsForever(list: PaymentListRow[], reason: 'manual' | 'auto_purge') {
  return writeTransaction(async (tx) => {
    for (const p of list) await deletePaymentPermanently(tx, p, p.memberName, reason);
  });
}

/** On app open (§10.2 Trash): payments in Trash for more than 30 days are deleted. Never throws. */
export async function purgeOldPaymentTrash(now = new Date()): Promise<number> {
  if (!getSettings().trash_auto_purge) return 0;
  try {
    const old = await listPurgeablePayments(getDb(), subDays(now, TRASH_RETENTION_DAYS).toISOString());
    if (old.length > 0) await deletePaymentsForever(old, 'auto_purge');
    return old.length;
  } catch (e) {
    logger.error('Payment trash auto-purge failed', e);
    return 0;
  }
}
