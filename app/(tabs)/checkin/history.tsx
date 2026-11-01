import { FlashList } from '@shopify/flash-list';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, EmptyState, ErrorState, SkeletonList } from '@/components';
import { rangeFor, type DayRange, type RangePreset } from '@/domain/collections';
import { todayISO } from '@/domain/dates';
import { useCan } from '@/features/auth/permissions';
import { useVisits } from '@/features/checkin/useVisits';
import { VisitRow } from '@/features/checkin/VisitRow';
import { openMember } from '@/features/members/useMemberRowActions';
import { DateRangeBar } from '@/features/payments/DateRangeBar';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

/** Attendance history (§10.4): pick a date or range → list + count; export (M11). */
export default function AttendanceHistoryScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { week_start } = useSettings();
  const canExport = useCan('members.export');
  const [preset, setPreset] = useState<RangePreset>('today');
  const [custom, setCustom] = useState<DayRange>({ from: todayISO(), to: todayISO() });
  const range = rangeFor(preset, todayISO(), week_start, custom);
  const v = useVisits(range.from, range.to);
  const members = new Set((v.rows ?? []).map((r) => r.memberId)).size;

  const body = () => {
    if (v.failed) return <ErrorState onRetry={v.reload} />;
    if (!v.rows) return <SkeletonList rows={6} />;
    return (
      <FlashList
        data={v.rows}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title={t('checkin.history.emptyTitle')} message={t('payments.emptyHint')} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 72 }} />}
        renderItem={({ item }) => <VisitRow row={item} showDate={range.from !== range.to} onPress={(r) => openMember(r.memberId)} />}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, gap: spacing.sm, paddingTop: spacing.sm }}>
      <Stack.Screen options={{ title: t('checkin.history.title'), headerLargeTitleEnabled: false }} />
      <DateRangeBar preset={preset} onPreset={setPreset} custom={custom} onCustom={setCustom} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg }}>
        <AppText variant="subhead" tone="secondary">
          {t('checkin.history.count', { count: v.rows?.length ?? 0, members })}
        </AppText>
        {canExport ? (
          <Button label={t('checkin.history.export')} icon="share-outline" variant="ghost" size="sm" onPress={() => router.push({ pathname: '/export', params: { dataset: 'attendance', from: range.from, to: range.to } })} />
        ) : null}
      </View>
      <View style={{ flex: 1 }}>{body()}</View>
    </View>
  );
}
