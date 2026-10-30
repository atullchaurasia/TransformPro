import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Badge, Card, Icon, StatusBadge } from '@/components';
import type { SubscriptionState } from '@/domain/lifecycle';
import type { SubscriptionRow } from '@/domain/memberProfile';
import { formatPaise } from '@/domain/money';
import { useMemberLabels } from '@/features/members/useMemberLabels';
import { usePlanLabels } from '@/features/plans/usePlanLabels';
import { useSettings } from '@/store/settingsStore';
import { minTapSize, useTheme } from '@/theme';

export function SubscriptionStateBadge({ state }: { state: SubscriptionState }) {
  const { t } = useTranslation();
  if (state === 'completed' || state === 'cancelled') return <Badge tone="neutral" label={t(`profile.state.${state}`)} />;
  return <StatusBadge status={state} />;
}

export type SubscriptionCardProps = {
  row: SubscriptionRow;
  trainerName: string | null;
  onActions?: () => void;
};

/** One plan in the Plans timeline: status, dates, amounts, paid and due (§10.2). */
export function SubscriptionCard({ row, trainerName, onActions }: SubscriptionCardProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code } = useSettings();
  const labels = useMemberLabels();
  const { category } = usePlanLabels();
  const { sub } = row;
  const money = (p: number) => formatPaise(p, currency_code);
  const details = [
    sub.sessionsTotal != null ? t('profile.sessionsUsed', { used: sub.sessionsUsed, total: sub.sessionsTotal }) : null,
    trainerName ? t('profile.overview.trainer', { name: trainerName }) : null,
    sub.frozenDaysTotal > 0 ? t('profile.frozenDays', { count: sub.frozenDaysTotal }) : null,
    row.openFreeze ? t('profile.frozenSince', { date: labels.date(row.openFreeze.fromDate) }) : null,
    row.openFreeze?.toDate ? t('profile.frozenUntil', { date: labels.date(row.openFreeze.toDate) }) : null,
    sub.renewedFromSubscriptionId ? t('profile.renewal') : null,
  ].filter(Boolean);

  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" tone="secondary">
              {category(sub.categorySnapshot)}
            </AppText>
            <AppText variant="headline" numberOfLines={2}>
              {sub.planNameSnapshot}
            </AppText>
          </View>
          <SubscriptionStateBadge state={row.state} />
          {onActions ? (
            <Pressable
              onPress={onActions}
              accessibilityRole="button"
              accessibilityLabel={t('profile.planActions', { name: sub.planNameSnapshot })}
              hitSlop={8}
              style={{ width: minTapSize, height: minTapSize, alignItems: 'center', justifyContent: 'center', marginTop: -spacing.sm, marginRight: -spacing.sm }}
            >
              <Icon name="ellipsis-horizontal-circle" size={26} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
        <AppText variant="subhead" tone="secondary">
          {t('profile.dates', { start: labels.date(sub.startDate), end: labels.date(sub.endDate) })}
        </AppText>
        {details.length > 0 ? (
          <AppText variant="footnote" tone="secondary">
            {details.join(' · ')}
          </AppText>
        ) : null}
        {sub.status === 'cancelled' ? (
          <AppText variant="footnote" tone="danger">
            {t('profile.cancelledNote', { reason: sub.cancelledReason ?? '' })}
            {sub.refundPaise ? ` · ${t('profile.refunded', { amount: money(sub.refundPaise) })}` : ''}
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.separator }}>
          <Amount label={t('members.pay.total')} value={money(sub.totalPaise)} />
          <Amount label={t('profile.paid')} value={money(row.netPaidPaise)} />
          <Amount label={t('profile.due')} value={money(row.duePaise)} danger={row.duePaise > 0} />
        </View>
      </View>
    </Card>
  );
}

function Amount({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="subhead" weight="600" tone={danger ? 'danger' : 'default'}>
        {value}
      </AppText>
    </View>
  );
}
