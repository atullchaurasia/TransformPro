import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components';
import { formatPaise } from '@/domain/money';
import { useMasked } from '@/features/auth/permissions';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { DashboardData } from './dashboardData';

/** This month (§10.1): collections vs last month, expenses, net profit, admissions, renewals, renewal rate. */
export function MonthPanel({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const { spacing, colors } = useTheme();
  const { currency_code } = useSettings();
  const mask = useMasked();
  const money = (p: number) => mask(formatPaise(p, currency_code));
  const m = data.month;
  const change = m.changePercent;
  const masked = mask('x') !== 'x';

  const row = (label: string, value: string, tone?: 'success' | 'danger') => (
    <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <AppText variant="subhead" tone="secondary">
        {label}
      </AppText>
      <AppText variant="subhead" weight="600" tone={tone}>
        {value}
      </AppText>
    </View>
  );

  return (
    <Card>
      <AppText variant="footnote" tone="secondary" weight="600">
        {t('dashboard.month.title').toUpperCase()}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.xs }}>
        <AppText variant="title1">{money(m.collectedPaise)}</AppText>
        {!masked && change != null ? (
          // Text carries the sign and words, so the colour is never the only cue.
          <AppText variant="subhead" weight="700" style={{ color: change >= 0 ? colors.success : colors.danger }}>
            {t(change >= 0 ? 'dashboard.month.up' : 'dashboard.month.down', { percent: Math.abs(change) })}
          </AppText>
        ) : null}
      </View>
      <AppText variant="footnote" tone="secondary" style={{ marginBottom: spacing.sm }}>
        {t('dashboard.month.lastMonth', { amount: money(m.lastMonthCollectedPaise) })}
      </AppText>
      {row(t('dashboard.month.refunds'), money(m.refundedPaise))}
      {row(t('dashboard.month.expenses'), money(m.expensesPaise))}
      {row(t('dashboard.month.netProfit'), money(m.netProfitPaise), masked ? undefined : m.netProfitPaise >= 0 ? 'success' : 'danger')}
      {row(t('dashboard.month.admissions'), String(m.admissions))}
      {row(t('dashboard.month.renewals'), String(m.renewals))}
      {row(t('dashboard.month.renewalRate'), m.renewalRatePercent != null ? `${m.renewalRatePercent}%` : '—')}
    </Card>
  );
}
