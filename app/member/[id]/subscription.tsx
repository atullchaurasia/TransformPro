import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, ErrorState, FormScreen, SkeletonList } from '@/components';
import { validateSubscriptionEdit } from '@/domain/lifecycle';
import { formatPaise } from '@/domain/money';
import type { PlanLine } from '@/domain/newMember';
import { useCan } from '@/features/auth/permissions';
import { PlanLineCard } from '@/features/members/PlanLineCard';
import { useMemberLookups } from '@/features/members/useMemberLookups';
import { usePlanPayment } from '@/features/members/usePlanPayment';
import { editSubscription, loadProfile, type LoadedProfile } from '@/features/profile/profileActions';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

/** Edit one plan's dates, price, discount and trainer (§10.2 Plans tab → Edit). */
export default function EditSubscriptionScreen() {
  const { t } = useTranslation();
  const { currency_code } = useSettings();
  const { id, subscriptionId } = useLocalSearchParams<{ id: string; subscriptionId: string }>();
  const allowed = useCan('membership.edit_dates');
  const { trainers } = useMemberLookups();
  const pp = usePlanPayment();
  const [profile, setProfile] = useState<LoadedProfile | null | 'missing'>(null);
  const [saving, setSaving] = useState(false);
  const { setOnlyLine } = pp;

  useEffect(() => {
    loadProfile(id)
      .then((p) => {
        const sub = p?.subscriptions.find((s) => s.id === subscriptionId);
        const plan = sub ? p?.plans.get(sub.planId) : undefined;
        if (!p || !sub || !plan) return setProfile('missing');
        const line: PlanLine = {
          // Snapshots win: the plan may have been renamed or repriced since (§5.2).
          plan: {
            id: plan.id,
            name: sub.planNameSnapshot,
            category: sub.categorySnapshot,
            durationValue: plan.durationValue,
            durationUnit: plan.durationUnit,
            sessionCount: sub.sessionsTotal ?? plan.sessionCount,
            pricePaise: sub.basePricePaise,
            admissionFeePaise: sub.admissionFeePaise || plan.admissionFeePaise,
          },
          startDate: sub.startDate,
          endDate: sub.endDate,
          basePricePaise: sub.basePricePaise,
          includeAdmission: sub.admissionFeePaise > 0,
          discount: sub.discountPaise > 0 ? { type: 'amount', paise: sub.discountPaise } : null,
          discountReason: sub.discountReason,
          trainerId: sub.trainerId,
        };
        setOnlyLine(line);
        setProfile(p);
      })
      .catch((e: unknown) => {
        logger.error('Loading plan failed', e);
        setProfile('missing');
      });
  }, [id, subscriptionId, setOnlyLine]);

  const header = <Stack.Screen options={{ title: t('profile.editPlan.title'), headerLeft: () => <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={() => router.back()} /> }} />;
  if (!allowed) return <>{header}<ErrorState message={t('auth.noPermission')} /></>;
  if (profile === 'missing') return <>{header}<ErrorState message={t('profile.editPlan.notFound')} /></>;
  if (!profile || !pp.lines[0]) return <>{header}<FormScreen><SkeletonList rows={5} /></FormScreen></>;

  const row = profile.summary.rows.find((r) => r.sub.id === subscriptionId);
  if (!row) return <>{header}<ErrorState message={t('profile.editPlan.notFound')} /></>;
  const draft = pp.drafts[0] ?? null;
  const belowPaid = draft ? validateSubscriptionEdit(draft.totalPaise, row.netPaidPaise) : null;

  const save = async () => {
    if (!draft || pp.errors[0] || belowPaid) return toast.error(t('members.plan.fixErrors'));
    setSaving(true);
    try {
      await editSubscription(profile.member, row.sub, {
        startDate: draft.startDate,
        endDate: draft.endDate,
        trainerId: draft.trainerId,
        basePricePaise: draft.basePricePaise,
        admissionFeePaise: draft.admissionFeePaise,
        discountPaise: draft.discountPaise,
        discountReason: draft.discountReason,
        taxPaise: draft.taxPaise,
        totalPaise: draft.totalPaise,
      });
      toast.success(t('profile.editPlan.saved', { name: row.sub.planNameSnapshot }));
      router.back();
    } catch (e) {
      logger.error('Editing plan failed', e);
      toast.error(t('common.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {header}
      <FormScreen>
        <AppText variant="headline">{profile.member.fullName}</AppText>
        <PlanLineCard line={pp.lines[0]} draft={draft} error={pp.errors[0] ?? null} trainers={trainers} onChange={(l) => pp.setLine(0, l)} />
        {row.netPaidPaise > 0 ? (
          <AppText variant="footnote" tone={belowPaid ? 'danger' : 'secondary'}>
            {t(belowPaid ? 'profile.editPlan.belowPaid' : 'profile.editPlan.paidSoFar', { amount: formatPaise(row.netPaidPaise, currency_code) })}
          </AppText>
        ) : null}
        <AppText variant="footnote" tone="secondary">
          {t('profile.editPlan.taxNote')}
        </AppText>
        <Button label={t('common.save')} onPress={() => void save()} loading={saving} fullWidth />
      </FormScreen>
    </>
  );
}
