import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { AmountInput, AppText, Button, DateField, ErrorState, FormScreen, Input, Select, SkeletonList } from '@/components';
import type { PaymentMode } from '@/db/models';
import { formatPaise } from '@/domain/money';
import { useCan } from '@/features/auth/permissions';
import { MemberPickerSheet } from '@/features/members/MemberPickerSheet';
import { PAYMENT_MODES } from '@/features/members/PaymentCard';
import { saveRefund } from '@/features/payments/paymentActions';
import { ReceiptActions } from '@/features/payments/ReceiptActions';
import { ADVANCE, useRefund } from '@/features/payments/useRefund';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

/** Record a refund (§10.5): against a plan (up to what was paid on it) or the unused advance. */
export default function RefundScreen() {
  const { t } = useTranslation();
  const { currency_code, currency_symbol, date_format } = useSettings();
  const params = useLocalSearchParams<{ memberId?: string; subscriptionId?: string }>();
  const allowed = useCan('payments.refund');
  const [memberId, setMemberId] = useState<string | null>(params.memberId ?? null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string[] | null>(null);
  const r = useRefund(memberId, params.subscriptionId);
  const { control, formState, handleSubmit } = r.form;
  const money = (p: number) => formatPaise(p, currency_code);

  const header = <Stack.Screen options={{ title: t('payments.refund.title'), headerLeft: done ? () => null : () => <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={() => router.back()} /> }} />;
  if (!allowed) return <>{header}<ErrorState message={t('auth.noPermission')} /></>;
  if (done) {
    return (
      <>
        {header}
        <FormScreen>
          <AppText variant="headline" align="center">
            {t('payments.refund.saved')}
          </AppText>
          <ReceiptActions paymentIds={done} />
          <Button label={t('common.done')} variant="ghost" onPress={() => router.back()} fullWidth />
        </FormScreen>
      </>
    );
  }

  const save = handleSubmit(async (v) => {
    if (!r.loaded || !r.target) return toast.error(t('payments.refund.pickTarget'));
    if (v.amountPaise > r.target.maxPaise) return toast.error(t('payments.refund.tooMuch', { max: money(r.target.maxPaise) }));
    setSaving(true);
    try {
      const refund = await saveRefund(r.loaded.member, r.target.subscription, v.amountPaise, { mode: v.mode, reference: v.reference.trim() || null, paidOn: v.paidOn, note: v.note.trim() });
      toast.success(t('payments.refund.done', { amount: money(v.amountPaise) }));
      setDone([refund.id]);
    } catch (e) {
      logger.error('Refund failed', e);
      toast.error(t('common.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      {header}
      <FormScreen>
        {r.loaded ? (
          <Button label={r.loaded.member.fullName} icon="person-outline" variant="secondary" onPress={params.memberId ? () => undefined : () => setPicking(true)} fullWidth />
        ) : memberId && r.profile === null ? (
          <SkeletonList rows={2} />
        ) : (
          <Button label={t('payments.record.pickMember')} icon="person-outline" variant="secondary" onPress={() => setPicking(true)} fullWidth />
        )}
        {r.loaded && r.targets.length === 0 ? (
          <AppText tone="secondary" align="center">
            {t('payments.refund.nothing')}
          </AppText>
        ) : null}
        {r.loaded && r.targets.length > 0 ? (
          <>
            <Select
              label={t('payments.refund.against')}
              value={r.target?.key ?? null}
              onChange={r.setTargetKey}
              options={r.targets.map((x) => ({
                value: x.key,
                label: x.key === ADVANCE ? t('receipt.advance') : (x.subscription?.planNameSnapshot ?? ''),
                description: t('payments.refund.upTo', { amount: money(x.maxPaise) }),
              }))}
            />
            <Controller
              control={control}
              name="amountPaise"
              render={({ field }) => (
                <AmountInput label={t('payments.refund.amount')} required value={field.value || null} onChange={(p) => field.onChange(p ?? 0)} currencySymbol={currency_symbol} error={formState.errors.amountPaise?.message} helper={r.target ? t('payments.refund.upTo', { amount: money(r.target.maxPaise) }) : undefined} />
              )}
            />
            <Controller
              control={control}
              name="mode"
              render={({ field }) => <Select<PaymentMode> label={t('profile.cancel.refundMode')} value={field.value} onChange={field.onChange} options={PAYMENT_MODES.map((m) => ({ value: m, label: t(`payments.mode.${m}`) }))} />}
            />
            <Controller control={control} name="reference" render={({ field }) => <Input label={t('members.pay.reference')} value={field.value} onChangeText={field.onChange} autoCapitalize="characters" maxLength={60} />} />
            <Controller control={control} name="paidOn" render={({ field }) => <DateField label={t('profile.cancel.refundDate')} value={field.value} onChange={(d) => field.onChange(d ?? '')} dateFormat={date_format} />} />
            <Controller control={control} name="note" render={({ field }) => <Input label={t('payments.refund.reason')} required value={field.value} onChangeText={field.onChange} maxLength={200} error={formState.errors.note?.message} />} />
            <Button label={t('payments.refund.submit')} variant="destructive" onPress={() => void save()} loading={saving} fullWidth />
          </>
        ) : null}
      </FormScreen>
      <MemberPickerSheet visible={picking} onClose={() => setPicking(false)} title={t('payments.record.pickMember')} onPick={(m) => setMemberId(m.id)} />
    </>
  );
}
