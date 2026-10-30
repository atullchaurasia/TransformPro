import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { remainingFreezeDays } from '@/domain/freeze';
import { addDaysISO } from '@/domain/dates';
import { checkChangePlan, planActionsFor, renewalTarget, unfreezeOutcome, type PlanAction } from '@/domain/lifecycle';
import type { SubscriptionRow } from '@/domain/memberProfile';
import { useCan } from '@/features/auth/permissions';
import { useMemberLabels } from '@/features/members/useMemberLabels';
import { confirm, toast } from '@/store/feedbackStore';
import { useCurrentStaff } from '@/store/sessionStore';
import { logger } from '@/utils/logger';

import { removeSubscription, unfreeze, type LoadedProfile } from './profileActions';

export type PlanSheet = { kind: 'freeze' | 'extend' | 'cancel'; row: SubscriptionRow } | null;

/** Which actions each plan offers and what they do (§10.2 Plans tab, §6.3–6.4). */
export function usePlanActions(profile: LoadedProfile) {
  const { t } = useTranslation();
  const labels = useMemberLabels();
  const staff = useCurrentStaff();
  const access = {
    renew: useCan('membership.renew'),
    freeze: useCan('membership.freeze'),
    editDates: useCan('membership.edit_dates'),
    create: useCan('membership.create'),
    cancel: useCan('membership.cancel'),
    owner: staff?.role === 'owner',
  };
  const canOverride = useCan('membership.freeze_override');
  const [menu, setMenu] = useState<SubscriptionRow | null>(null);
  const [sheet, setSheet] = useState<PlanSheet>(null);
  const { member, summary, today, plans } = profile;
  const memberId = member.id;

  const actionsFor = (row: SubscriptionRow): PlanAction[] =>
    member.deletedAt
      ? []
      : planActionsFor(
          {
            state: row.state,
            category: row.sub.categorySnapshot,
            isLatestOfCategory: renewalTarget(summary.rows.map((r) => r.sub), row.sub.categorySnapshot)?.id === row.sub.id,
            hasOpenFreeze: !!row.openFreeze,
            canChangePlan: checkChangePlan(row.sub, today, !!row.openFreeze).ok,
            paymentRows: row.paymentRows,
          },
          access,
        );

  const doUnfreeze = async (row: SubscriptionRow) => {
    const open = row.openFreeze;
    if (!open) return;
    const plan = plans.get(row.sub.planId);
    const remaining = remainingFreezeDays({ maxFreezeDays: plan?.maxFreezeDays ?? 0, maxFreezeTimes: plan?.maxFreezeTimes ?? 0 }, { timesUsed: row.freezeCount, daysUsed: row.sub.frozenDaysTotal });
    const outcome = unfreezeOutcome(open, today, remaining, canOverride);
    const newEnd = addDaysISO(row.sub.endDate, outcome.days);
    const ok = await confirm({
      title: t('profile.unfreeze.title', { name: row.sub.planNameSnapshot }),
      message: [
        t('profile.unfreeze.message', { count: outcome.days, from: labels.date(row.sub.endDate), to: labels.date(newEnd) }),
        outcome.capped ? t('profile.unfreeze.capped', { count: outcome.days }) : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      confirmLabel: t('profile.planAction.unfreeze'),
    });
    if (!ok) return;
    try {
      await unfreeze(member, row.sub, open, outcome);
      toast.success(t('profile.unfreeze.done', { date: labels.date(newEnd) }));
    } catch (e) {
      logger.error('Unfreeze failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  const doDelete = async (row: SubscriptionRow) => {
    const ok = await confirm({ title: t('profile.deletePlan.title', { name: row.sub.planNameSnapshot }), message: t('profile.deletePlan.message'), destructive: true, confirmLabel: t('common.delete') });
    if (!ok) return;
    try {
      await removeSubscription(member, row.sub);
      toast.success(t('profile.deletePlan.done', { name: row.sub.planNameSnapshot }));
    } catch (e) {
      logger.error('Delete plan failed', e);
      toast.error(t('profile.deletePlan.failed'));
    }
  };

  const onSelect = (action: PlanAction, row: SubscriptionRow) => {
    const subscriptionId = row.sub.id;
    switch (action) {
      case 'renew':
        return router.push({ pathname: '/member/[id]/renew', params: { id: memberId, mode: 'renew', subscriptionId } });
      case 'changePlan':
        return router.push({ pathname: '/member/[id]/renew', params: { id: memberId, mode: 'change', subscriptionId } });
      case 'edit':
        return router.push({ pathname: '/member/[id]/subscription', params: { id: memberId, subscriptionId } });
      case 'freeze':
      case 'extend':
      case 'cancel':
        return setSheet({ kind: action, row });
      case 'unfreeze':
        return void doUnfreeze(row);
      case 'delete':
        return void doDelete(row);
    }
  };

  return { actionsFor, menu, setMenu, sheet, closeSheet: () => setSheet(null), onSelect, canOverride, canAdd: access.create && !member.deletedAt };
}
