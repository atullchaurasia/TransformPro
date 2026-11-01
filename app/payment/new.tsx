import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AmountInput, AppText, Avatar, Button, Card, DateField, ErrorState, FormScreen, Icon, Input, ListRow, Select, SkeletonList } from '@/components';
import type { Payment, PaymentMode } from '@/db/models';
import { formatPaise } from '@/domain/money';
import { formatPhone } from '@/domain/phones';
import { useCan } from '@/features/auth/permissions';
import { MemberPickerSheet } from '@/features/members/MemberPickerSheet';
import { PAYMENT_MODES } from '@/features/members/PaymentCard';
import { DuesSplitCard } from '@/features/payments/DuesSplitCard';
import { savePayment } from '@/features/payments/paymentActions';
import { ReceiptActions } from '@/features/payments/ReceiptActions';
import { useRecordPayment } from '@/features/payments/useRecordPayment';
import { resolvePhotoUri } from '@/services/photos';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

/** Record payment (§10.5): member → open plans with dues → amount → mode → reference → date → note → receipt. */
export default function RecordPaymentScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code, currency_symbol, date_format } = useSettings();
  const params = useLocalSearchParams<{ memberId?: string }>();
  const allowed = useCan('payments.create');
  const [memberId, setMemberId] = useState<string | null>(params.memberId ?? null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Payment[] | null>(null);
  const s = useRecordPayment(memberId);
  const { control, formState, handleSubmit, setValue } = s.form;
  const money = (p: number) => formatPaise(p, currency_code);

  const header = <Stack.Screen options={{ title: t('quickActions.recordPayment'), headerLeft: () => <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={() => router.back()} /> }} />;
  if (!allowed) return <>{header}<ErrorState message={t('auth.noPermission')} /></>;

  const overpaid = s.split && !s.split.ok && s.split.error === 'overpayment';
  const splitError = s.split && !s.split.ok && s.split.error !== 'overpayment' ? s.split.error : null;

  const save = handleSubmit(async (v) => {
    if (!s.loaded || !s.split?.ok) return toast.error(t('payments.record.fixAmount'));
    setSaving(true);
    try {
      const payments = await savePayment(s.loaded.member, s.split.allocations, s.loaded.subscriptions, {
        mode: v.mode,
        reference: v.reference.trim() || null,
        paidOn: v.paidOn,
        note: v.note.trim() || null,
      });
      toast.success(t('payments.record.saved', { amount: money(s.paying) }));
      setSaved(payments);
    } catch (e) {
      logger.error('Recording payment failed', e);
      toast.error(t('payments.record.failed'));
    } finally {
      setSaving(false);
    }
  });

  const submit = () => {
    // A manual split pays exactly the sum of its parts.
    if (s.manual) setValue('amountPaise', s.manualTotal, { shouldValidate: false });
    void save();
  };

  const member = s.loaded?.member;
  if (saved) {
    return (
      <>
        <Stack.Screen options={{ title: t('payments.record.doneTitle'), headerLeft: () => null }} />
        <FormScreen>
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Icon name="checkmark-circle" size={56} color={colors.success} />
            <AppText variant="title2" align="center">
              {money(saved.reduce((sum, p) => sum + p.amountPaise, 0))}
            </AppText>
            <AppText variant="subhead" tone="secondary" align="center">
              {[member?.fullName, saved.map((p) => p.receiptNumber).join(', ')].filter(Boolean).join(' · ')}
            </AppText>
          </View>
          <ReceiptActions paymentIds={saved.map((p) => p.id)} />
          <Button label={t('common.done')} variant="ghost" onPress={() => router.back()} fullWidth />
        </FormScreen>
      </>
    );
  }
  return (
    <>
      {header}
      <FormScreen>
        {member ? (
          <Card onPress={params.memberId ? undefined : () => setPicking(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={member.fullName} uri={resolvePhotoUri(member.photoUri)} size={44} />
              <View style={{ flex: 1 }}>
                <AppText variant="headline">{member.fullName}</AppText>
                <AppText variant="footnote" tone="secondary">
                  {member.memberCode} · {formatPhone(member.phone)}
                </AppText>
              </View>
              {params.memberId ? null : <AppText tone="brand">{t('payments.record.change')}</AppText>}
            </View>
          </Card>
        ) : memberId && s.profile === null ? (
          <SkeletonList rows={2} />
        ) : (
          <Button label={t('payments.record.pickMember')} icon="person-outline" variant="secondary" onPress={() => setPicking(true)} fullWidth />
        )}
        {s.profile === 'missing' ? <ErrorState message={t('members.notFound')} /> : null}

        {s.loaded ? (
          <>
            <DuesSplitCard state={s} />
            {!s.manual || s.advanceOnly ? (
              <Controller
                control={control}
                name="amountPaise"
                render={({ field }) => (
                  <AmountInput
                    label={s.advanceOnly ? t('payments.record.advanceAmount') : t('payments.record.amount')}
                    required
                    value={field.value || null}
                    onChange={(p) => field.onChange(p ?? 0)}
                    currencySymbol={currency_symbol}
                    error={formState.errors.amountPaise?.message ?? (overpaid ? t('members.pay.overpayment', { max: money(s.totalDue) }) : undefined)}
                  />
                )}
              />
            ) : (
              <AppText variant="headline" align="right">
                {t('payments.record.manualTotal', { amount: money(s.manualTotal) })}
              </AppText>
            )}
            {splitError ? (
              <AppText variant="footnote" tone="danger">
                {t(`payments.record.error.${splitError}`)}
              </AppText>
            ) : null}
            {!s.manual && !s.advanceOnly && (overpaid || s.asAdvance) ? (
              <View style={{ marginHorizontal: -spacing.lg }}>
                <ListRow
                  title={t('members.pay.asAdvanceToggle')}
                  subtitle={t('members.pay.asAdvanceHint')}
                  right={<Switch value={s.asAdvance} onValueChange={s.setAsAdvance} accessibilityLabel={t('members.pay.asAdvanceToggle')} />}
                />
              </View>
            ) : null}
            <Controller
              control={control}
              name="mode"
              render={({ field }) => <Select<PaymentMode> label={t('members.pay.mode')} value={field.value} onChange={field.onChange} options={PAYMENT_MODES.map((m) => ({ value: m, label: t(`payments.mode.${m}`) }))} />}
            />
            <Controller
              control={control}
              name="reference"
              render={({ field }) => <Input label={t('members.pay.reference')} helper={t('members.pay.referenceHelp')} value={field.value} onChangeText={field.onChange} autoCapitalize="characters" autoCorrect={false} maxLength={60} />}
            />
            <Controller control={control} name="paidOn" render={({ field }) => <DateField label={t('members.pay.paidOn')} value={field.value} onChange={(d) => field.onChange(d ?? '')} dateFormat={date_format} error={formState.errors.paidOn?.message} />} />
            <Controller control={control} name="note" render={({ field }) => <Input label={t('payments.record.note')} value={field.value} onChangeText={field.onChange} maxLength={200} />} />
            <Button label={t('payments.record.save', { amount: money(s.paying) })} onPress={submit} loading={saving} disabled={!s.split?.ok} fullWidth />
          </>
        ) : null}
      </FormScreen>
      <MemberPickerSheet visible={picking} onClose={() => setPicking(false)} title={t('payments.record.pickMember')} onPick={(m) => setMemberId(m.id)} />
    </>
  );
}
