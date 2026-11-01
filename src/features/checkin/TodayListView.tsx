import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ActionSheet, Chip, EmptyState, ErrorState, SkeletonList } from '@/components';
import type { AttendanceRow } from '@/db/repositories/attendance';
import { filterToday, type TodayFilter } from '@/domain/attendance';
import { todayISO } from '@/domain/dates';
import { useCan } from '@/features/auth/permissions';
import { openMember } from '@/features/members/useMemberRowActions';
import { confirm, toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { deleteAttendance, performCheckout } from './checkinActions';
import { useVisits } from './useVisits';
import { VisitRow } from './VisitRow';

type RowAction = 'checkout' | 'profile' | 'delete';

/** Today's list (§10.4): in/out times, Inside/Left filter, manual check-out, delete a wrong entry. */
export function TodayListView() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const today = todayISO();
  const v = useVisits(today, today);
  const canMark = useCan('attendance.mark');
  const canDelete = useCan('attendance.delete');
  const [filter, setFilter] = useState<TodayFilter>('all');
  const [active, setActive] = useState<AttendanceRow | null>(null);
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => filterToday(v.rows ?? [], filter), [v.rows, filter]);
  const count = (f: TodayFilter) => filterToday(v.rows ?? [], f).length;

  const run = async (a: RowAction, r: AttendanceRow) => {
    try {
      if (a === 'profile') return openMember(r.memberId);
      if (a === 'checkout') {
        await performCheckout(r);
        return toast.success(t('checkin.checkedOutName', { name: r.memberName }));
      }
      const ok = await confirm({ title: t('checkin.deleteTitle', { name: r.memberName }), message: t('checkin.deleteMessage'), destructive: true, confirmLabel: t('common.delete') });
      if (!ok) return;
      await deleteAttendance(r);
      toast.success(t('checkin.deleted'));
    } catch (e) {
      logger.error('Visit action failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  const body = () => {
    if (v.failed) return <ErrorState onRetry={v.reload} />;
    if (!v.rows) return <SkeletonList rows={6} />;
    return (
      <FlashList
        data={rows}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<EmptyState icon="people-outline" title={t('checkin.todayEmptyTitle')} message={t('checkin.todayEmptyMessage')} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 72 }} />}
        renderItem={({ item }) => (
          <VisitRow
            row={item}
            onPress={(r) => {
              setActive(r);
              setOpen(true);
            }}
          />
        )}
      />
    );
  };

  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }} style={{ flexGrow: 0 }}>
        {(['all', 'inside', 'left'] as const).map((f) => (
          <Chip key={f} label={t(`checkin.filter.${f}`)} count={count(f)} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>
      <View style={{ flex: 1 }}>{body()}</View>
      <ActionSheet<RowAction>
        visible={open}
        onClose={() => setOpen(false)}
        title={active?.memberName}
        items={[
          ...(canMark && active && !active.checkOutAt ? [{ key: 'checkout' as const, label: t('checkin.checkOut'), icon: 'log-out-outline' as const }] : []),
          { key: 'profile', label: t('checkin.openProfile'), icon: 'person-outline', color: colors.info },
          ...(canDelete ? [{ key: 'delete' as const, label: t('checkin.deleteEntry'), icon: 'trash-outline' as const, destructive: true }] : []),
        ]}
        onSelect={(a) => active && void run(a, active)}
      />
    </View>
  );
}
