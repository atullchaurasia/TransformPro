import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AmountInput, AppText, Card, ListRow } from '@/components';
import { formatPaise } from '@/domain/money';
import { useMemberLabels } from '@/features/members/useMemberLabels';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { useRecordPayment } from './useRecordPayment';

/** Open plans with dues (oldest first) and how this payment is split across them (§6.5). */
export function DuesSplitCard({ state }: { state: ReturnType<typeof useRecordPayment> }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code, currency_symbol } = useSettings();
  const labels = useMemberLabels();
  const money = (p: number) => formatPaise(p, currency_code);
  const applied = new Map((state.split?.ok ? state.split.allocations : []).map((a) => [a.subscriptionId, a.amountPaise]));
  const advance = applied.get(null) ?? 0;

  if (state.advanceOnly) {
    return (
      <Card>
        <AppText variant="subhead" tone="secondary">
          {t('payments.record.nothingDue')}
        </AppText>
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="headline">{t('payments.record.openPlans')}</AppText>
          <AppText variant="headline" tone="danger">
            {money(state.totalDue)}
          </AppText>
        </View>
        {state.dues.map(({ row, duePaise }) => (
          <View key={row.sub.id} style={{ gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.separator }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" numberOfLines={1}>
                  {row.sub.planNameSnapshot}
                </AppText>
                <AppText variant="footnote" tone="secondary">
                  {t('profile.dates', { start: labels.date(row.sub.startDate), end: labels.date(row.sub.endDate) })} · {t('payments.record.due', { amount: money(duePaise) })}
                </AppText>
              </View>
              {!state.manual && applied.has(row.sub.id) ? (
                <AppText variant="subhead" tone="success" weight="600">
                  {money(applied.get(row.sub.id) ?? 0)}
                </AppText>
              ) : null}
            </View>
            {state.manual ? (
              <AmountInput label={t('payments.record.payOnPlan')} value={state.parts[row.sub.id] || null} onChange={(p) => state.setPart(row.sub.id, p ?? 0)} currencySymbol={currency_symbol} />
            ) : null}
          </View>
        ))}
        {advance > 0 ? (
          <AppText variant="footnote" tone="success">
            {t('payments.record.advancePart', { amount: money(advance) })}
          </AppText>
        ) : null}
        {state.dues.length > 1 ? (
          <View style={{ marginHorizontal: -spacing.lg }}>
            <ListRow
              title={t('payments.record.splitManually')}
              subtitle={t('payments.record.splitHint')}
              right={<Switch value={state.manual} onValueChange={state.setManual} accessibilityLabel={t('payments.record.splitManually')} />}
            />
          </View>
        ) : null}
      </View>
    </Card>
  );
}
