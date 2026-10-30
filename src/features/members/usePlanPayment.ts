import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PaymentMode, Plan } from '@/db/models';
import { todayISO } from '@/domain/dates';
import { PriceError, type TaxSettings } from '@/domain/money';
import { draftSubscription, LineError, newLine, planNewMemberPayment, type PlanLine, type SubscriptionDraft } from '@/domain/newMember';
import { useSettings } from '@/store/settingsStore';

export type PaymentState = {
  /** null = follow the total (default "paid now = total", §10.2). */
  paidPaise: number | null;
  mode: PaymentMode;
  reference: string;
  paidOn: string;
  asAdvance: boolean;
};

/** Takes `prepaid` off the plan totals in order (an advance already paid covers the first plans). */
function afterPrepaid(drafts: SubscriptionDraft[], prepaid: number): { totalPaise: number }[] {
  let left = prepaid;
  return drafts.map((d) => {
    const take = Math.min(left, d.totalPaise);
    left -= take;
    return { totalPaise: d.totalPaise - take };
  });
}

export type PlanPaymentOptions = {
  /** Advance the member already paid that will be applied to these plans (renewals, §6.5). */
  prepaid?: (totalPaise: number) => number;
};

/** State + calculations for Plan & Payment (Add member step 2, renew, add plan, change plan). */
export function usePlanPayment(options: PlanPaymentOptions = {}) {
  const { t } = useTranslation();
  const s = useSettings();
  const tax: TaxSettings = { enabled: s.tax_enabled, percent: s.tax_percent, inclusive: s.tax_inclusive };
  const [lines, setLines] = useState<PlanLine[]>([]);
  const [payment, setPayment] = useState<PaymentState>({ paidPaise: null, mode: 'cash', reference: '', paidOn: todayISO(), asAdvance: false });

  const computed = useMemo(() => {
    const drafts: (SubscriptionDraft | null)[] = [];
    const errors: (string | null)[] = [];
    for (const line of lines) {
      try {
        drafts.push(draftSubscription(line, tax));
        errors.push(line.plan.category === 'personal_training' && !line.trainerId ? t('members.plan.pickTrainer') : null);
      } catch (e) {
        drafts.push(null);
        errors.push(
          e instanceof LineError
            ? t('members.plan.endBeforeStart')
            : e instanceof PriceError && e.code === 'discount_too_large'
              ? t('members.plan.discountTooLarge')
              : t('members.plan.invalid'),
        );
      }
    }
    const valid = drafts.filter((d): d is SubscriptionDraft => d !== null);
    const total = valid.reduce((sum, d) => sum + d.totalPaise, 0);
    const prepaid = Math.max(0, Math.min(total, options.prepaid?.(total) ?? 0));
    const paid = payment.paidPaise ?? total - prepaid;
    const plan = valid.length === drafts.length ? planNewMemberPayment(afterPrepaid(valid, prepaid), paid, payment.asAdvance) : null;
    return { drafts, errors, total, prepaid, paid, plan, hasErrors: errors.some(Boolean) || !plan || !plan.ok };
    // tax fields are primitives from settings; `prepaid` is read fresh on each calculation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, payment, s.tax_enabled, s.tax_percent, s.tax_inclusive, t, options.prepaid]);

  // PT and services run alongside the membership, so every line starts today by default
  // (§10.2 "start date (default today)"); each start/end stays editable.
  /** Renew / add plan / change plan: exactly one line. Stable, so effects can depend on it. */
  const setOnlyLine = useCallback((line: PlanLine | null) => setLines(line ? [line] : []), []);

  const addPlan = (plan: Plan) => setLines((ls) => [...ls, newLine(plan, todayISO())]);

  return {
    reset: () => {
      setLines([]);
      setPayment({ paidPaise: null, mode: 'cash', reference: '', paidOn: todayISO(), asAdvance: false });
    },
    lines,
    setLine: (i: number, line: PlanLine) => setLines((ls) => ls.map((l, j) => (j === i ? line : l))),
    removeLine: (i: number) => setLines((ls) => ls.filter((_, j) => j !== i)),
    addPlan,
    replaceMembership: (plan: Plan | null) =>
      setLines((ls) => {
        const rest = ls.filter((l) => l.plan.category !== 'membership');
        return plan ? [newLine(plan, todayISO()), ...rest] : rest;
      }),
    setOnlyLine,
    payment,
    setPayment: (patch: Partial<PaymentState>) => setPayment((p) => ({ ...p, ...patch })),
    ...computed,
  };
}

export type PlanPaymentState = ReturnType<typeof usePlanPayment>;
