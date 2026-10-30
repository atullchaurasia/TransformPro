import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Plan, PlanCategory } from '@/db/models';
import { todayISO } from '@/domain/dates';
import { advanceBalance, advancesToApply } from '@/domain/dues';
import { checkChangePlan, prorationCredit, renewalTarget } from '@/domain/lifecycle';
import { newLine, type PlanLine } from '@/domain/newMember';
import { planDuration } from '@/domain/plans';
import { planRenewal } from '@/domain/renewal';
import { useMemberLookups } from '@/features/members/useMemberLookups';
import { usePlanPayment } from '@/features/members/usePlanPayment';
import { logger } from '@/utils/logger';

import { loadProfile, type LoadedProfile } from './profileActions';

export type RenewMode = 'renew' | 'add' | 'change';

/**
 * State for Renew / Add plan / Change plan (§6.3, §10.2). The start date follows §6.3 and
 * stays editable (owner override); a change of plan pre-fills the proration credit.
 */
export function useRenewal(memberId: string, requestedMode: RenewMode, subscriptionId: string | undefined) {
  const { t } = useTranslation();
  const lookups = useMemberLookups();
  const [profile, setProfile] = useState<LoadedProfile | null | 'missing'>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [category, setCategory] = useState<PlanCategory>('membership');
  const [startFromExpiry, setStartFromExpiry] = useState(false);
  const [applyCredit, setApplyCredit] = useState(true);
  const today = todayISO();

  const loaded = profile && profile !== 'missing' ? profile : null;
  // From the members list swipe there's no subscription id: renew the latest membership,
  // or add a first plan when the member has none.
  const previous = loaded ? (subscriptionId ? loaded.subscriptions.find((s) => s.id === subscriptionId) : requestedMode === 'renew' ? renewalTarget(loaded.subscriptions) : null) ?? null : null;
  const mode = requestedMode === 'renew' && loaded && !previous && !subscriptionId ? 'add' : requestedMode;
  const payments = loaded?.payments;

  // Advances are linked whole, oldest first, while they fit (domain `advancesToApply`).
  const prepaid = useCallback(
    (total: number) => {
      if (!payments) return 0;
      const ids = new Set(advancesToApply(payments, total));
      return payments.filter((p) => ids.has(p.id)).reduce((sum, p) => sum + p.amountPaise, 0);
    },
    [payments],
  );
  const pp = usePlanPayment({ prepaid });

  useEffect(() => {
    loadProfile(memberId)
      .then((p) => setProfile(p ?? 'missing'))
      .catch((e: unknown) => {
        logger.error('Loading member for renewal failed', e);
        setProfile('missing');
      });
  }, [memberId]);

  const activeCategory: PlanCategory = previous?.categorySnapshot ?? category;
  const plans = useMemo(() => lookups.plans.filter((p) => p.isActive && !p.deletedAt && p.category === activeCategory), [lookups.plans, activeCategory]);
  // Default plan: the same plan again when it's still offered (not for a change of plan).
  const defaultPlanId = mode !== 'change' && previous && plans.some((p) => p.id === previous.planId) ? previous.planId : (plans[0]?.id ?? null);
  const plan: Plan | null = plans.find((p) => p.id === (planId ?? defaultPlanId)) ?? null;
  const change = previous && mode === 'change' ? checkChangePlan(previous, today, loaded?.freezes.some((f) => f.subscriptionId === previous.id && f.endedAt == null) ?? false) : null;
  const proration = previous && mode === 'change' ? prorationCredit(previous, today) : null;
  const wasExpired = mode === 'renew' && !!previous && previous.endDate < today;

  const buildLine = useCallback((): PlanLine | null => {
    if (!plan) return null;
    let start = today;
    if (mode === 'renew' && previous) start = planRenewal({ previous, today, duration: planDuration(plan), startFromExpiry }).startDate;
    if (mode === 'change' && change?.ok) start = change.newStartDate;
    const line = { ...newLine(plan, start), trainerId: previous?.trainerId ?? null };
    // A renewal doesn't charge admission again; a brand-new plan may.
    if (mode !== 'add') line.includeAdmission = false;
    if (proration && applyCredit && proration.creditPaise > 0) {
      const max = line.basePricePaise + (line.includeAdmission ? plan.admissionFeePaise : 0);
      line.discount = { type: 'amount', paise: Math.min(proration.creditPaise, max) };
      line.discountReason = t('profile.change.creditReason', { plan: previous?.planNameSnapshot ?? '', count: proration.unusedDays });
    }
    return line;
    // `change`/`proration` derive from previous + today
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id, mode, previous?.id, startFromExpiry, applyCredit, today, t]);

  const { setOnlyLine } = pp;
  useEffect(() => {
    if (loaded) setOnlyLine(buildLine());
  }, [loaded, buildLine, setOnlyLine]);

  return {
    mode,
    profile,
    loaded,
    previous,
    plans,
    plan,
    setPlanId,
    category: activeCategory,
    setCategory: (c: PlanCategory) => {
      setCategory(c);
      setPlanId(null);
    },
    wasExpired,
    startFromExpiry,
    setStartFromExpiry,
    change,
    proration,
    applyCredit,
    setApplyCredit,
    advancePaise: payments ? advanceBalance(payments) : 0,
    trainers: lookups.trainers,
    pp,
  };
}
