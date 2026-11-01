// Loads everything the dashboard shows (§10.1) in one go: SQL aggregates + member buckets.
import { addDays, endOfMonth, startOfDay, startOfMonth, subMonths } from 'date-fns';

import type { Db } from '@/db/types';
import { loadDashboardAggregates, type DashboardRanges } from '@/db/repositories/dashboard';
import { loadMemberListData } from '@/db/repositories/members';
import type { AppSettings } from '@/domain/settings';
import { backupReminder, dailySeries, memberBuckets, monthSummary, peakHours } from '@/domain/dashboard';
import { addDaysISO, formatDay } from '@/domain/dates';
import { buildMemberSummaries } from '@/domain/memberList';

export const CHART_DAYS = 30;

export function dashboardRanges(now: Date): DashboardRanges {
  const today = formatDay(now);
  const lastMonth = subMonths(now, 1);
  return {
    today,
    todayStartIso: startOfDay(now).toISOString(),
    tomorrowStartIso: startOfDay(addDays(now, 1)).toISOString(),
    monthFrom: formatDay(startOfMonth(now)),
    monthTo: formatDay(endOfMonth(now)),
    monthStartIso: startOfMonth(now).toISOString(),
    nextMonthStartIso: startOfMonth(addDays(endOfMonth(now), 1)).toISOString(),
    lastMonthFrom: formatDay(startOfMonth(lastMonth)),
    lastMonthTo: formatDay(endOfMonth(lastMonth)),
    chartFrom: addDaysISO(today, -(CHART_DAYS - 1)),
  };
}

type DashboardSettings = Pick<AppSettings, 'expiring_soon_days' | 'grace_period_days' | 'last_backup_at' | 'backup_reminder_days'>;

/** Takes the DB and settings as arguments so the < 500 ms target can be measured in tests. */
export async function loadDashboard(db: Db, settings: DashboardSettings, now = new Date()) {
  const ranges = dashboardRanges(now);
  const [agg, list] = await Promise.all([loadDashboardAggregates(db, ranges), loadMemberListData(db)]);
  const summaries = buildMemberSummaries({
    ...list,
    today: ranges.today,
    settings: { expiringSoonDays: settings.expiring_soon_days, gracePeriodDays: settings.grace_period_days },
  });
  const freezeEnds = new Map(list.openFreezes.filter((f) => f.toDate).map((f) => [f.memberId, f.toDate as string]));
  const buckets = memberBuckets(summaries, {
    renewedToday: new Set(agg.renewedTodayMemberIds),
    lastVisitByMember: list.lastVisitByMember,
    freezeEnds,
    today: ranges.today,
    expiringSoonDays: settings.expiring_soon_days,
  });
  return {
    ranges,
    agg,
    buckets,
    dueTotalPaise: buckets.dues.reduce((s, m) => s + m.duePaise, 0),
    collectedTodayPaise: agg.collectedTodayByMode.reduce((s, m) => s + m.amountPaise, 0),
    month: monthSummary(agg.month),
    collections: dailySeries(agg.dailyCollections, ranges.chartFrom, ranges.today),
    attendance: dailySeries(agg.dailyAttendance, ranges.chartFrom, ranges.today),
    peakHours: peakHours(agg.peakHours),
    backup: backupReminder(settings.last_backup_at, settings.backup_reminder_days, now),
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
