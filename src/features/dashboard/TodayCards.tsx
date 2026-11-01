import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, type IconName } from '@/components';
import { formatPaise } from '@/domain/money';
import { useCan, useMasked } from '@/features/auth/permissions';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { DashboardData } from './dashboardData';
import { openBucket } from './openBucket';

type StatCardProps = { icon: IconName; color: string; label: string; value: string; detail?: string; onPress?: () => void };

function StatCard({ icon, color, label, value, detail, onPress }: StatCardProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[label, value, detail].filter(Boolean).join(', ')}
      style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, padding: spacing.md, borderRadius: radius.lg, gap: 4, backgroundColor: pressed ? colors.surfaceMuted : colors.surface })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={16} color={color} />
        <AppText variant="footnote" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </AppText>
      </View>
      <AppText variant="title2" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {detail ? (
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {detail}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** Today: check-ins + inside, collection with mode split, expenses, admissions, renewals (§10.1). */
export function TodayCards({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code } = useSettings();
  const mask = useMasked();
  const canPayments = useCan('payments.view');
  const canExpenses = useCan('expenses.view');
  const money = (p: number) => mask(formatPaise(p, currency_code));
  const split = data.agg.collectedTodayByMode.map((m) => `${t(`payments.mode.${m.mode}`)} ${money(m.amountPaise)}`).join(' · ');

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
      <StatCard
        icon="enter-outline"
        color={colors.info}
        label={t('dashboard.today.checkins')}
        value={String(data.agg.checkinsToday)}
        detail={t('dashboard.today.inside', { count: data.agg.insideNow })}
        onPress={() => router.push({ pathname: '/checkin', params: { view: 'today', at: String(Date.now()) } })}
      />
      {canPayments ? (
        <StatCard icon="cash-outline" color={colors.success} label={t('dashboard.today.collection')} value={money(data.collectedTodayPaise)} detail={split || undefined} onPress={() => router.push('/payments')} />
      ) : null}
      {canExpenses ? (
        // TODO(M17): open today's expenses.
        <StatCard icon="receipt-outline" color={colors.warning} label={t('dashboard.today.expenses')} value={money(data.agg.expensesTodayPaise)} onPress={() => openComingSoon('M17', t('dashboard.today.expenses'))} />
      ) : null}
      <StatCard icon="person-add-outline" color={colors.primary} label={t('dashboard.today.admissions')} value={String(data.buckets.admissionsToday.length)} onPress={() => openBucket('admissionsToday')} />
      <StatCard icon="refresh" color={colors.primary} label={t('dashboard.today.renewals')} value={String(data.buckets.renewalsToday.length)} onPress={() => openBucket('renewalsToday')} />
    </View>
  );
}
