import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AmountInput, AppText, BottomSheet, Button, DateField, Input, Select } from '@/components';
import type { Member, PaymentMode } from '@/db/models';
import { todayISO } from '@/domain/dates';
import type { SubscriptionRow } from '@/domain/memberProfile';
import { formatPaise } from '@/domain/money';
import { useCan } from '@/features/auth/permissions';
import { PAYMENT_MODES } from '@/features/members/PaymentCard';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { cancelSchema, type CancelFormValues } from './lifecycleSchemas';
import { cancel } from './profileActions';
import { useLifecycleMessages } from './useLifecycleMessages';

/** Cancel a plan with a reason and an optional refund (§10.2). Refunding needs `payments.refund`. */
export function CancelSheet({ row, member, onClose }: { row: SubscriptionRow | null; member: Member; onClose: () => void }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { currency_code, currency_symbol, date_format } = useSettings();
  const canRefund = useCan('payments.refund');
  const messages = useLifecycleMessages();
  // What was actually paid on the plan is the most that can go back (§6.5 maxRefundable).
  const maxRefund = canRefund ? Math.max(0, row?.netPaidPaise ?? 0) : 0;
  const money = (p: number) => formatPaise(p, currency_code);
  const schema = useMemo(
    () => cancelSchema({ ...messages, refundTooLarge: t('profile.cancel.refundTooLarge', { max: formatPaise(maxRefund, currency_code) }) }, maxRefund),
    [messages, maxRefund, t, currency_code],
  );
  const defaults: CancelFormValues = { reason: '', refundPaise: 0, mode: 'cash', paidOn: todayISO() };
  const { control, handleSubmit, reset, formState } = useForm<CancelFormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const refund = useWatch({ control, name: 'refundPaise' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row) reset({ reason: '', refundPaise: 0, mode: 'cash', paidOn: todayISO() });
  }, [row, reset]);

  if (!row) return null;
  const { sub } = row;

  // The sheet itself is the confirmation step (reason required, red button) — a second
  // dialog can't be presented over a sheet on iOS.
  const submit = handleSubmit(async (v) => {
    setSaving(true);
    try {
      await cancel(member, sub, v.reason, v.refundPaise > 0 ? { amountPaise: v.refundPaise, details: { mode: v.mode, reference: null, paidOn: v.paidOn, note: v.reason.trim() } } : null);
      toast.success(t('profile.cancel.done', { name: sub.planNameSnapshot }));
      onClose();
    } catch (e) {
      logger.error('Cancel failed', e);
      toast.error(t('common.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  });

  return (
    <BottomSheet visible onClose={onClose} title={t('profile.cancel.title', { name: sub.planNameSnapshot })}>
      <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
        <AppText variant="subhead" tone="secondary">
          {t('profile.cancel.warning')}
        </AppText>
        <Controller
          control={control}
          name="reason"
          render={({ field }) => <Input label={t('profile.cancel.reason')} required value={field.value} onChangeText={field.onChange} maxLength={200} error={formState.errors.reason?.message} />}
        />
        {maxRefund > 0 ? (
          <>
            <AppText variant="footnote" tone="secondary">
              {t('profile.cancel.paidSoFar', { amount: money(maxRefund) })}
            </AppText>
            <Controller
              control={control}
              name="refundPaise"
              render={({ field }) => (
                <AmountInput label={t('profile.cancel.refund')} value={field.value || null} onChange={(p) => field.onChange(p ?? 0)} currencySymbol={currency_symbol} error={formState.errors.refundPaise?.message} />
              )}
            />
            {refund > 0 ? (
              <>
                <Controller
                  control={control}
                  name="mode"
                  render={({ field }) => (
                    <Select<PaymentMode> label={t('profile.cancel.refundMode')} value={field.value} onChange={field.onChange} options={PAYMENT_MODES.map((m) => ({ value: m, label: t(`payments.mode.${m}`) }))} />
                  )}
                />
                <Controller control={control} name="paidOn" render={({ field }) => <DateField label={t('profile.cancel.refundDate')} value={field.value} onChange={(d) => field.onChange(d ?? '')} dateFormat={date_format} />} />
              </>
            ) : null}
          </>
        ) : null}
        <Button
          label={refund > 0 ? t('profile.cancel.submitRefund', { amount: money(refund) }) : t('profile.cancel.submit')}
          variant="destructive"
          onPress={() => void submit()}
          loading={saving}
          fullWidth
        />
      </View>
    </BottomSheet>
  );
}
