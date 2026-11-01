import { addMonths, format, subMonths } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ErrorState, Icon, SkeletonList } from '@/components';
import type { Attendance } from '@/db/models';
import { attendanceStats, monthGrid, visitMinutes } from '@/domain/attendance';
import { parseDay, todayISO } from '@/domain/dates';
import { useDataVersion } from '@/store/dataVersionStore';
import { useSettings } from '@/store/settingsStore';
import { minTapSize, useTheme } from '@/theme';
import { formatDate, formatMonth, formatTime } from '@/utils/format';
import { logger } from '@/utils/logger';

import { AttendanceCalendar } from './AttendanceCalendar';
import { loadMemberVisits } from './checkinActions';

/** Profile Attendance tab (§10.2): month calendar, in/out list, visits per month, streak, average visit. */
export function MemberAttendanceTab({ memberId }: { memberId: string }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { week_start, language, date_format } = useSettings();
  const dataVersion = useDataVersion();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [visits, setVisits] = useState<Attendance[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setVisits(await loadMemberVisits(memberId));
    } catch (e) {
      logger.error('Loading member attendance failed', e);
      setFailed(true);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const stats = useMemo(() => attendanceStats(visits ?? [], today), [visits, today]);
  const weeks = useMemo(() => monthGrid(month, week_start, stats.visitedDays, today), [month, week_start, stats.visitedDays, today]);
  const inMonth = (visits ?? []).filter((v) => v.date.startsWith(month));
  const shift = (by: number) => setMonth(format(by > 0 ? addMonths(parseDay(`${month}-01`), 1) : subMonths(parseDay(`${month}-01`), 1), 'yyyy-MM'));

  if (failed) return <ErrorState onRetry={load} />;
  if (!visits) return <View style={{ paddingHorizontal: spacing.lg }}><SkeletonList rows={4} /></View>;

  const stat = (label: string, value: string) => (
    <Card style={{ flex: 1 }}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="title3">{value}</AppText>
    </Card>
  );

  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {stat(t('checkin.stats.thisMonth'), String(stats.visitsByMonth.get(month) ?? 0))}
        {stat(t('checkin.stats.streak'), t('checkin.stats.days', { count: stats.streak }))}
        {stat(t('checkin.stats.average'), stats.averageMinutes != null ? t('checkin.minutes', { count: stats.averageMinutes }) : '—')}
      </View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <Pressable onPress={() => shift(-1)} accessibilityRole="button" accessibilityLabel={t('checkin.calendar.previous')} style={{ width: minTapSize, height: minTapSize, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <AppText variant="headline" align="center" style={{ flex: 1 }}>
            {formatMonth(`${month}-01`, language)}
          </AppText>
          <Pressable onPress={() => shift(1)} accessibilityRole="button" accessibilityLabel={t('checkin.calendar.next')} style={{ width: minTapSize, height: minTapSize, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-forward" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <AttendanceCalendar weeks={weeks} weekStart={week_start} />
      </Card>
      {inMonth.length === 0 ? (
        <AppText tone="secondary" align="center">
          {t('checkin.noVisitsMonth')}
        </AppText>
      ) : (
        <Card padded={false}>
          {inMonth.map((v, i) => {
            const mins = visitMinutes(v);
            return (
              <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.separator }}>
                <AppText variant="body">{formatDate(v.date, date_format)}</AppText>
                <AppText variant="subhead" tone="secondary">
                  {`${formatTime(v.checkInAt, language)} → ${v.checkOutAt ? formatTime(v.checkOutAt, language) : t('checkin.inside')}${mins != null ? ` · ${t('checkin.minutes', { count: mins })}` : ''}`}
                </AppText>
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}
