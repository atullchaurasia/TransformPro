import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AmountInput, AppText, Card, DateField, Input, ListRow, Select } from '@/components';
import type { PaymentMode } from '@/db/models';
import { formatPaise } from '@/domain/money';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { PlanPaymentState } from './usePlanPayment';

export const PAYMENT_MODES: PaymentMode[] = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'];

/** Total → paid now (defaults to total) → mode → reference → balance due (§10.2). */
export function PaymentCard({ state }: { state: PlanPaymentState }) {
  const { t } = useTranslation();
  const { spacing, colors } = useTheme();
  const { currency_code, currency_symbol, date_format } = useSettings();
  const money = (p: number) => formatPaise(p, currency_code);
  // An advance already paid (renewals) is applied before "paid now" (§6.5).
  const payable = state.total - state.prepaid;
  const over = state.paid > payable;
  const balance = Math.max(0, payable - state.paid);
  const planError = state.plan && !state.plan.ok ? state.plan.error : null;

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="headline">{t('members.pay.total')}</AppText>
          <AppText variant="title3">{money(state.total)}</AppText>
        </View>
        {state.prepaid > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="subhead" tone="secondary">
              {t('members.pay.advanceApplied')}
            </AppText>
            <AppText variant="subhead" tone="success">
              −{money(state.prepaid)}
            </AppText>
          </View>
        ) : null}
        <AmountInput
          label={t('members.pay.paidNow')}
          value={state.paid}
          onChange={(v) => state.setPayment({ paidPaise: v ?? 0 })}
          currencySymbol={currency_symbol}
          error={planError === 'overpayment' ? t('members.pay.overpayment', { max: money(payable) }) : undefined}
        />
        {over ? (
          <View style={{ marginHorizontal: -spacing.lg }}>
            <ListRow
              title={t('members.pay.asAdvance', { amount: money(state.paid - payable) })}
              subtitle={t('members.pay.asAdvanceHint')}
              right={<Switch value={state.payment.asAdvance} onValueChange={(asAdvance) => state.setPayment({ asAdvance })} accessibilityLabel={t('members.pay.asAdvanceToggle')} />}
            />
          </View>
        ) : null}
        {state.paid > 0 ? (
          <>
            <Select<PaymentMode>
              label={t('members.pay.mode')}
              value={state.payment.mode}
              onChange={(mode) => state.setPayment({ mode })}
              options={PAYMENT_MODES.map((m) => ({ value: m, label: t(`payments.mode.${m}`) }))}
            />
            {state.payment.mode !== 'cash' ? (
              <Input
                label={t('members.pay.reference')}
                helper={t('members.pay.referenceHelp')}
                value={state.payment.reference}
                onChangeText={(reference) => state.setPayment({ reference })}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            ) : null}
            <DateField label={t('members.pay.paidOn')} value={state.payment.paidOn} onChange={(v) => v && state.setPayment({ paidOn: v })} dateFormat={date_format} />
          </>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.separator }}>
          <AppText variant="headline">{t('members.pay.balance')}</AppText>
          <AppText variant="title3" tone={balance > 0 ? 'danger' : 'success'}>
            {money(balance)}
          </AppText>
        </View>
      </View>
    </Card>
  );
}
