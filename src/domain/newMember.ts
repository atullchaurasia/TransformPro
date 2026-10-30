// "Plan & Payment" step of Add member (spec §10.2): turns the chosen plans into
// subscription rows with price snapshots, and splits "paid now" across them.
import type { ISODate, Paise, Plan, Subscription } from '@/db/models';

import { computeEndDate } from './dates';
import { allocatePayment, type Allocation, type AllocationResult } from './dues';
import { computeSubscriptionPrice, type Discount, type SubscriptionPrice, type TaxSettings } from './money';
import { planDuration, planSessions } from './plans';

export type LinePlan = Pick<
  Plan,
  'id' | 'name' | 'category' | 'durationValue' | 'durationUnit' | 'sessionCount' | 'pricePaise' | 'admissionFeePaise'
>;

export type PlanLine = {
  plan: LinePlan;
  startDate: ISODate;
  /** Auto-filled from the plan; the user may edit it. */
  endDate: ISODate;
  /** Base price, pre-filled from the plan but editable. */
  basePricePaise: Paise;
  includeAdmission: boolean;
  discount: Discount | null;
  discountReason: string | null;
  /** PT plans: the trainer. */
  trainerId: string | null;
};

export type SubscriptionDraft = Pick<
  Subscription,
  | 'planId'
  | 'planNameSnapshot'
  | 'categorySnapshot'
  | 'startDate'
  | 'endDate'
  | 'sessionsTotal'
  | 'sessionsUsed'
  | 'basePricePaise'
  | 'admissionFeePaise'
  | 'discountPaise'
  | 'discountReason'
  | 'taxPaise'
  | 'totalPaise'
  | 'trainerId'
  | 'status'
  | 'frozenDaysTotal'
  | 'renewedFromSubscriptionId'
> & { price: SubscriptionPrice };

export function defaultEndDate(plan: LinePlan, startDate: ISODate): ISODate {
  return computeEndDate(startDate, planDuration(plan));
}

/** Fresh line for a plan starting on `startDate`. */
export function newLine(plan: LinePlan, startDate: ISODate): PlanLine {
  return {
    plan,
    startDate,
    endDate: defaultEndDate(plan, startDate),
    basePricePaise: plan.pricePaise,
    includeAdmission: plan.admissionFeePaise > 0,
    discount: null,
    discountReason: null,
    trainerId: null,
  };
}

export class LineError extends Error {
  constructor(public readonly code: 'end_before_start') {
    super(code);
  }
}

export function draftSubscription(line: PlanLine, tax: TaxSettings): SubscriptionDraft {
  if (line.endDate < line.startDate) throw new LineError('end_before_start');
  const price = computeSubscriptionPrice({
    basePricePaise: line.basePricePaise,
    admissionFeePaise: line.includeAdmission ? line.plan.admissionFeePaise : 0,
    discount: line.discount,
    tax,
  });
  return {
    planId: line.plan.id,
    // Snapshots keep history right if the plan is renamed or repriced later (§5.2).
    planNameSnapshot: line.plan.name,
    categorySnapshot: line.plan.category,
    startDate: line.startDate,
    endDate: line.endDate,
    sessionsTotal: planSessions(line.plan),
    sessionsUsed: 0,
    basePricePaise: price.basePricePaise,
    admissionFeePaise: price.admissionFeePaise,
    discountPaise: price.discountPaise,
    discountReason: price.discountPaise > 0 ? line.discountReason?.trim() || null : null,
    taxPaise: price.taxPaise,
    totalPaise: price.totalPaise,
    trainerId: line.plan.category === 'personal_training' ? line.trainerId : null,
    status: 'active',
    frozenDaysTotal: 0,
    renewedFromSubscriptionId: null,
    price,
  };
}

export type PaymentPlan = {
  totalPaise: Paise;
  paidPaise: Paise;
  balancePaise: Paise;
  /** One entry per subscription index that receives money (+ null = advance). */
  allocations: { index: number | null; amountPaise: Paise }[];
};

/**
 * Splits "paid now" across the new subscriptions in the order shown (membership, PT,
 * services). More than the total is only allowed as an advance (§6.5).
 */
export function planNewMemberPayment(
  drafts: Pick<SubscriptionDraft, 'totalPaise'>[],
  paidPaise: Paise,
  asAdvance: boolean,
): { ok: true; plan: PaymentPlan } | { ok: false; error: Exclude<AllocationResult, { ok: true }>['error']; maxPaise: Paise } {
  const totalPaise = drafts.reduce((s, d) => s + d.totalPaise, 0);
  if (paidPaise === 0) return { ok: true, plan: { totalPaise, paidPaise: 0, balancePaise: totalPaise, allocations: [] } };
  const dues = drafts.map((d, i) => ({ subscriptionId: String(i), duePaise: d.totalPaise }));
  const result = allocatePayment(paidPaise, dues, asAdvance);
  if (!result.ok) return { ok: false, error: result.error, maxPaise: result.maxPaise };
  return {
    ok: true,
    plan: {
      totalPaise,
      paidPaise,
      balancePaise: Math.max(0, totalPaise - paidPaise),
      allocations: result.allocations.map((a: Allocation) => ({
        index: a.subscriptionId === null ? null : Number(a.subscriptionId),
        amountPaise: a.amountPaise,
      })),
    },
  };
}
