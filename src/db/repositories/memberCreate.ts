import { formatPaise } from '@/domain/money';
import type { PaymentPlan, SubscriptionDraft } from '@/domain/newMember';

import type { Member, NewRow, Payment, Subscription } from '../models';
import type { Db } from '../types';

import { writeAudit } from './audit';
import { allocateMemberCode, isMemberCodeTaken } from './codes';
import { membersRepo, subscriptionsRepo } from './index';
import { recordPlanPayments, type PaymentDetails } from './payments';

export type NewMemberInput = {
  /** `memberCode: null` = allocate the next auto code. */
  member: Omit<NewRow<Member>, 'memberCode'> & { memberCode: string | null };
  subscriptions: Omit<SubscriptionDraft, 'price'>[];
  payment: (PaymentDetails & { plan: PaymentPlan }) | null;
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

  const payments: Payment[] = input.payment
    ? await recordPlanPayments(tx, {
        member,
        subscriptions,
        plan: input.payment.plan,
        details: input.payment,
        receivedBy: input.member.createdBy,
        currency: input.currency,
      })
    : [];

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
