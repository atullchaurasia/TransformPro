import { formatPaise } from '@/domain/money';
import type { PaymentPlan, SubscriptionDraft } from '@/domain/newMember';

import type { Member, NewRow, Payment, PaymentMode, Subscription } from '../models';
import type { Db } from '../types';

import { writeAudit } from './audit';
import { allocateMemberCode, allocateReceiptNumber, isMemberCodeTaken } from './codes';
import { membersRepo, paymentsRepo, subscriptionsRepo } from './index';

export type NewMemberInput = {
  /** `memberCode: null` = allocate the next auto code. */
  member: Omit<NewRow<Member>, 'memberCode'> & { memberCode: string | null };
  subscriptions: Omit<SubscriptionDraft, 'price'>[];
  payment: (Pick<Payment, 'mode' | 'reference' | 'paidOn' | 'note'> & { plan: PaymentPlan; mode: PaymentMode }) | null;
  currency: string;
};

export type NewMemberResult = { member: Member; subscriptions: Subscription[]; payments: Payment[] };

export class DuplicateCodeError extends Error {
  constructor(public readonly code: string) {
    super(`Member code ${code} is already used`);
  }
}

/**
 * Add member (§10.2): member + subscription(s) + payment(s) + code increment + audit, in the
 * caller's ONE transaction. One payment row (and receipt number) per subscription that gets
 * money, plus one for an advance — receipts stay per subscription (Decisions Log M06).
 */
export async function createMemberWithPlans(tx: Db, input: NewMemberInput): Promise<NewMemberResult> {
  let memberCode = input.member.memberCode?.trim().toUpperCase() || null;
  if (memberCode) {
    if (await isMemberCodeTaken(tx, memberCode)) throw new DuplicateCodeError(memberCode);
  } else {
    memberCode = await allocateMemberCode(tx);
  }

  const member = await membersRepo.create(tx, { ...input.member, memberCode });
  await writeAudit(tx, { action: 'member.create', entity: 'member', entityId: member.id, summary: `Added member ${member.fullName} (${memberCode})` });

  const subscriptions: Subscription[] = [];
  for (const draft of input.subscriptions) {
    const sub = await subscriptionsRepo.create(tx, {
      ...draft,
      memberId: member.id,
      branchId: member.branchId,
      cancelledReason: null,
      cancelledAt: null,
      refundPaise: null,
      createdBy: input.member.createdBy,
    });
    subscriptions.push(sub);
    await writeAudit(tx, {
      action: 'subscription.create',
      entity: 'subscription',
      entityId: sub.id,
      summary: `${member.fullName}: ${sub.planNameSnapshot} ${sub.startDate} → ${sub.endDate}, ${formatPaise(sub.totalPaise, input.currency)}`,
    });
  }

  const payments: Payment[] = [];
  if (input.payment) {
    for (const a of input.payment.plan.allocations) {
      const subscription = a.index === null ? null : subscriptions[a.index];
      if (a.index !== null && !subscription) throw new Error('Payment allocated to an unknown subscription');
      const payment = await paymentsRepo.create(tx, {
        receiptNumber: await allocateReceiptNumber(tx),
        memberId: member.id,
        subscriptionId: subscription?.id ?? null,
        branchId: member.branchId,
        amountPaise: a.amountPaise,
        mode: input.payment.mode,
        reference: input.payment.reference,
        paidOn: input.payment.paidOn,
        note: input.payment.note,
        receivedBy: input.member.createdBy,
        isRefund: false,
      });
      payments.push(payment);
      await writeAudit(tx, {
        action: 'payment.create',
        entity: 'payment',
        entityId: payment.id,
        summary: `${payment.receiptNumber}: ${formatPaise(payment.amountPaise, input.currency)} from ${member.fullName}${subscription ? ` for ${subscription.planNameSnapshot}` : ' (advance)'}`,
      });
    }
  }

  return { member, subscriptions, payments };
}

/** Edit member (§10.2). Code changes must stay unique. */
export async function updateMember(tx: Db, id: string, patch: Partial<Omit<NewRow<Member>, 'createdBy'>>): Promise<Member> {
  if (patch.memberCode) {
    patch.memberCode = patch.memberCode.trim().toUpperCase();
    if (await isMemberCodeTaken(tx, patch.memberCode, id)) throw new DuplicateCodeError(patch.memberCode);
  }
  const member = await membersRepo.update(tx, id, patch);
  await writeAudit(tx, { action: 'member.update', entity: 'member', entityId: id, summary: `Edited member ${member.fullName} (${member.memberCode})` });
  return member;
}
