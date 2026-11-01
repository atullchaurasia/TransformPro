import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';

import { AppText, Card, SegmentedControl } from '@/components';
import { formatPaise } from '@/domain/money';
import { useCan, useMasked } from '@/features/auth/permissions';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

import type { DashboardData } from './dashboardData';

type Span = '7' | '30';

/** Collections bar + attendance line for the last 7 / 30 days, and peak hours (§10.1). */
export function TrendCharts({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code, date_format } = useSettings();
  const { width } = useWindowDimensions();
  const mask = useMasked();
  const canPayments = useCan('payments.view');
  const [span, setSpan] = useState<Span>('7');
  const days = Number(span);
  const masked = mask('x') !== 'x';
  // Card padding + screen gutters + the y-axis label column.
  const chartWidth = Math.min(width, 700) - 2 * 16 - 2 * 16 - 44;
  const axis = { color: colors.textSecondary, fontSize: 10 };
  const label = (day: string, i: number, n: number) => (n <= 7 || i % 5 === 0 ? formatDate(day, date_format).slice(0, 5) : '');

  const coll = data.collections.slice(-days);
  const att = data.attendance.slice(-days);
  const totalColl = coll.reduce((s, d) => s + d.value, 0);
  const totalAtt = att.reduce((s, d) => s + d.value, 0);
  const spacingFor = (n: number) => Math.max(2, chartWidth / n - (n <= 7 ? 22 : 6));
  const barWidth = days <= 7 ? 22 : 6;
  const peakMax = Math.max(...data.peakHours);
  const busiest = data.peakHours.indexOf(peakMax);

  return (
    <View style={{ gap: spacing.md }}>
      <SegmentedControl<Span> value={span} onChange={setSpan} options={[{ value: '7', label: t('dashboard.charts.days', { count: 7 }) }, { value: '30', label: t('dashboard.charts.days', { count: 30 }) }]} />
      {canPayments ? (
        <Card>
          <AppText variant="footnote" tone="secondary" weight="600">
            {t('dashboard.charts.collections').toUpperCase()}
          </AppText>
          <AppText variant="headline" style={{ marginBottom: spacing.sm }}>
            {mask(formatPaise(totalColl, currency_code))}
          </AppText>
          {masked ? null : (
            <View accessible accessibilityLabel={t('dashboard.charts.collectionsA11y', { amount: formatPaise(totalColl, currency_code), count: days })}>
              <BarChart
                data={coll.map((d, i) => ({ value: d.value / 100, label: label(d.day, i, coll.length), frontColor: colors.primary }))}
                barWidth={barWidth}
                spacing={spacingFor(coll.length)}
                initialSpacing={4}
                barBorderTopLeftRadius={4}
                barBorderTopRightRadius={4}
                height={140}
                width={chartWidth}
                noOfSections={3}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={colors.separator}
                rulesColor={colors.separator}
                yAxisTextStyle={axis}
                xAxisLabelTextStyle={axis}
                formatYLabel={(v: string) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v)}
                isAnimated
              />
            </View>
          )}
        </Card>
      ) : null}
      <Card>
        <AppText variant="footnote" tone="secondary" weight="600">
          {t('dashboard.charts.attendance').toUpperCase()}
        </AppText>
        <AppText variant="headline" style={{ marginBottom: spacing.sm }}>
          {t('dashboard.charts.visits', { count: totalAtt })}
        </AppText>
        <View accessible accessibilityLabel={t('dashboard.charts.visits', { count: totalAtt })}>
          <LineChart
            data={att.map((d, i) => ({ value: d.value, label: label(d.day, i, att.length) }))}
            color={colors.info}
            thickness={2}
            curved
            areaChart
            startFillColor={colors.info}
            endFillColor={colors.info}
            startOpacity={0.18}
            endOpacity={0.02}
            dataPointsColor={colors.info}
            dataPointsRadius={4}
            hideDataPoints={att.length > 7}
            height={140}
            width={chartWidth}
            spacing={chartWidth / Math.max(1, att.length - 1)}
            initialSpacing={4}
            noOfSections={3}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={colors.separator}
            rulesColor={colors.separator}
            yAxisTextStyle={axis}
            xAxisLabelTextStyle={axis}
          />
        </View>
      </Card>
      <Card>
        <AppText variant="footnote" tone="secondary" weight="600">
          {t('dashboard.charts.peak').toUpperCase()}
        </AppText>
        <AppText variant="subhead" tone="secondary" style={{ marginBottom: spacing.sm }}>
          {peakMax > 0 ? t('dashboard.charts.busiest', { from: `${String(busiest).padStart(2, '0')}:00`, to: `${String((busiest + 1) % 24).padStart(2, '0')}:00` }) : t('dashboard.charts.noVisits')}
        </AppText>
        <View accessible accessibilityLabel={t('dashboard.charts.peakA11y')}>
          <BarChart
            data={data.peakHours.map((v, h) => ({ value: v, label: h % 6 === 0 ? `${h}` : '', frontColor: h === busiest && v > 0 ? colors.primary : colors.info }))}
            barWidth={Math.max(4, chartWidth / 24 - 4)}
            spacing={3}
            initialSpacing={2}
            barBorderTopLeftRadius={3}
            barBorderTopRightRadius={3}
            height={100}
            width={chartWidth}
            noOfSections={2}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={colors.separator}
            rulesColor={colors.separator}
            yAxisTextStyle={axis}
            xAxisLabelTextStyle={axis}
          />
        </View>
      </Card>
    </View>
  );
}
