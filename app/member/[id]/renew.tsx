import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, ErrorState, FormScreen, ListRow, SegmentedControl, Select, SkeletonList } from '@/components';
import type { PlanCategory } from '@/db/models';
import { formatPaise } from '@/domain/money';
import { PLAN_CATEGORIES } from '@/domain/plans';
import { useCan } from '@/features/auth/permissions';
import { PaymentCard } from '@/features/members/PaymentCard';
import { PlanLineCard } from '@/features/members/PlanLineCard';
import { useMemberLabels } from '@/features/members/useMemberLabels';
import { ReceiptActions } from '@/features/payments/ReceiptActions';
import { saveChangePlan, saveNewSubscription } from '@/features/profile/profileActions';
import { useRenewal, type RenewMode } from '@/features/profile/useRenewal';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

/** Renew (§6.3), add a plan, or change plan with a proration suggestion (§10.2). */
export default function RenewScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { currency_code } = useSettings();
  const labels = useMemberLabels();
  const params = useLocalSearchParams<{ id: string; mode?: RenewMode; subscriptionId?: string }>();
  const requested: RenewMode = params.mode === 'renew' || params.mode === 'change' ? params.mode : 'add';
  const r = useRenewal(params.id, requested, params.subscriptionId);
  const mode = r.mode;
  const canRenew = useCan('membership.renew');
  const canCreate = useCan('membership.create');
  const allowed = mode === 'renew' ? canRenew : canCreate;
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ paymentIds: string[]; message: string } | null>(null);
  const { pp } = r;
  const money = (p: number) => formatPaise(p, currency_code);

  const title = t(`profile.renew.title.${mode}`);
  const header = <Stack.Screen options={{ title, headerLeft: () => <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={() => router.back()} /> }} />;
  if (!allowed) return <>{header}<ErrorState message={t('auth.noPermission')} /></>;
  if (done) {
    return (
      <>
        <Stack.Screen options={{ title, headerLeft: () => null }} />
        <FormScreen>
          <AppText variant="headline" align="center">
            {done.message}
          </AppText>
          <ReceiptActions paymentIds={done.paymentIds} />
          <Button label={t('common.done')} variant="ghost" onPress={() => router.back()} fullWidth />
        </FormScreen>
      </>
    );
  }
  if (r.profile === 'missing' || (mode !== 'add' && r.loaded && !r.previous)) return <>{header}<ErrorState message={t('members.notFound')} /></>;
  if (!r.loaded) return <>{header}<FormScreen><SkeletonList rows={5} /></FormScreen></>;
  if (r.change && !r.change.ok) return <>{header}<ErrorState message={t(`profile.change.blocked.${r.change.reason}`)} /></>;

  const { member } = r.loaded;
  const line = pp.lines[0];

  const save = async () => {
    if (!line || pp.hasErrors) return toast.error(t('members.plan.fixErrors'));
    const draft = pp.drafts[0];
    if (!draft) return;
    const { price: _price, ...sub } = draft;
    const plan = pp.plan?.ok ? pp.plan.plan : null;
    const payment = plan && plan.paidPaise > 0 ? { plan, mode: pp.payment.mode, reference: pp.payment.reference.trim() || null, paidOn: pp.payment.paidOn, note: null } : null;
    setSaving(true);
    try {
      const result =
        mode === 'change' && r.previous && r.change?.ok
          ? await saveChangePlan(r.previous, r.change.oldEndDate, { member, draft: sub, payment })
          : await saveNewSubscription({ member, draft: sub, payment, renewedFromSubscriptionId: mode === 'renew' ? (r.previous?.id ?? null) : null, kind: mode === 'renew' ? 'renew' : 'create' });
      const message = t('profile.renew.saved', { plan: sub.planNameSnapshot, date: labels.date(sub.endDate) });
      toast.success(message);
      // With a payment, stay to offer the receipt (§10.5); otherwise we're done.
      if (result.payments.length > 0) setDone({ paymentIds: result.payments.map((p) => p.id), message });
      else router.back();
    } catch (e) {
      logger.error('Saving plan failed', e);
      toast.error(t('profile.renew.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {header}
      <FormScreen>
        <AppText variant="headline">{member.fullName}</AppText>
        {r.previous ? (
          <Card>
            <AppText variant="footnote" tone="secondary">
              {t(mode === 'change' ? 'profile.change.current' : 'profile.renew.previous')}
            </AppText>
            <AppText variant="headline">{r.previous.planNameSnapshot}</AppText>
            <AppText variant="subhead" tone="secondary">
              {t('profile.dates', { start: labels.date(r.previous.startDate), end: labels.date(r.previous.endDate) })}
            </AppText>
            {mode === 'change' && r.change?.ok ? (
              <AppText variant="footnote" tone="secondary" style={{ marginTop: spacing.xs }}>
                {t('profile.change.endsOn', { date: labels.date(r.change.oldEndDate) })}
              </AppText>
            ) : null}
          </Card>
        ) : (
          <SegmentedControl<PlanCategory> value={r.category} onChange={r.setCategory} options={PLAN_CATEGORIES.map((c) => ({ value: c, label: t(`plans.segment.${c}`) }))} />
        )}

        {r.plans.length === 0 ? (
          <AppText variant="subhead" tone="secondary">
            {t('profile.renew.noPlans')}
          </AppText>
        ) : (
          <Select
            label={t('profile.renew.plan')}
            value={r.plan?.id ?? null}
            onChange={r.setPlanId}
            options={r.plans.map((p) => ({ value: p.id, label: p.name, description: money(p.pricePaise), color: p.color ?? undefined }))}
          />
        )}

        {r.wasExpired ? (
          <View style={{ marginHorizontal: -spacing.lg }}>
            <ListRow
              title={t('profile.renew.fromExpiry')}
              subtitle={t('profile.renew.fromExpiryHint')}
              right={<Switch value={r.startFromExpiry} onValueChange={r.setStartFromExpiry} accessibilityLabel={t('profile.renew.fromExpiry')} />}
            />
          </View>
        ) : null}

        {r.proration && r.proration.creditPaise > 0 ? (
          <Card>
            <AppText variant="subhead">
              {r.proration.unusedSessions != null && r.previous?.sessionsTotal
                ? t('profile.change.unusedSessions', { count: r.proration.unusedSessions, amount: money(r.proration.creditPaise) })
                : t('profile.change.unusedDays', { count: r.proration.unusedDays, amount: money(r.proration.creditPaise) })}
            </AppText>
            <View style={{ marginHorizontal: -spacing.lg }}>
              <ListRow
                title={t('profile.change.applyCredit')}
                subtitle={t('profile.change.applyCreditHint')}
                right={<Switch value={r.applyCredit} onValueChange={r.setApplyCredit} accessibilityLabel={t('profile.change.applyCredit')} />}
              />
            </View>
          </Card>
        ) : null}

        {line ? (
          <>
            <PlanLineCard line={line} draft={pp.drafts[0] ?? null} error={pp.errors[0] ?? null} trainers={r.trainers} onChange={(l) => pp.setLine(0, l)} />
            <PaymentCard state={pp} />
            <Button label={t(`profile.renew.save.${mode}`)} onPress={() => void save()} loading={saving} fullWidth />
          </>
        ) : null}
      </FormScreen>
    </>
  );
}
