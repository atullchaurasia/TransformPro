import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ErrorState, FAB, ScreenScroll, SectionHeader, SkeletonList } from '@/components';
import { lockNow } from '@/features/auth/lockActions';
import { AttentionList } from '@/features/dashboard/AttentionList';
import { BackupBanner, DashboardHeader } from '@/features/dashboard/DashboardHeader';
import { MonthPanel } from '@/features/dashboard/MonthPanel';
import { StatusDonut } from '@/features/dashboard/StatusDonut';
import { TodayCards } from '@/features/dashboard/TodayCards';
import { TrendCharts } from '@/features/dashboard/TrendCharts';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { HeaderIconButton } from '@/features/navigation/HeaderIconButton';
import { QuickActionsSheet } from '@/features/navigation/QuickActionsSheet';
import { useTheme } from '@/theme';

/** Home / Dashboard (spec §10.1). */
export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const d = useDashboard();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <HeaderIconButton icon="search" accessibilityLabel={t('a11y.search')} onPress={() => router.push('/search')} />
              <HeaderIconButton icon="lock-closed-outline" accessibilityLabel={t('a11y.lock')} onPress={lockNow} />
            </View>
          ),
        }}
      />
      <ScreenScroll bottomInset={80} onRefresh={() => void d.refresh()} refreshing={d.refreshing}>
        <View style={{ gap: spacing.lg }}>
          <DashboardHeader />
          {d.failed ? (
            <ErrorState onRetry={d.reload} />
          ) : !d.data ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <SkeletonList rows={6} />
            </View>
          ) : (
            <>
              <BackupBanner backup={d.data.backup} />
              <View>
                <SectionHeader title={t('dashboard.today.title')} />
                <TodayCards data={d.data} />
              </View>
              <AttentionList data={d.data} />
              <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
                <StatusDonut data={d.data} />
                <MonthPanel data={d.data} />
                <TrendCharts data={d.data} />
              </View>
            </>
          )}
        </View>
      </ScreenScroll>
      <FAB accessibilityLabel={t('a11y.quickActions')} onPress={() => setQuickActionsOpen(true)} />
      <QuickActionsSheet visible={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
    </View>
  );
}
