// Dashboard maths (spec §10.1). Member "buckets" are computed by ONE function that both the
// card counts and the tapped list use, so a card's number always matches its list.
import { differenceInCalendarDays, parseISO } from 'date-fns';

import type { ISODate, Paise } from '@/db/models';

import { absentees } from './attendance';
import { addDaysISO } from './dates';
import type { MemberSummary } from './memberList';

export const MEMBER_BUCKETS = [
  'admissionsToday',
  'renewalsToday',
  'expiringToday',
  'expiringSoon',
  'winBack',
  'dues',
  'birthdays',
  'anniversaries',
  'absent',
  'frozenEnding',
  'statusActive',
  'statusExpired',
  'statusFrozen',
  'statusUpcoming',
  'statusNoPlan',
  'all',
] as const;
export type MemberBucket = (typeof MEMBER_BUCKETS)[number];

export const isMemberBucket = (v: unknown): v is MemberBucket => typeof v === 'string' && (MEMBER_BUCKETS as readonly string[]).includes(v);

/** "Absent" on the dashboard = active members not seen for 7+ days (§10.1). */
export const ABSENT_DASHBOARD_DAYS = 7;
/** Win-back = expired in the last 30 days and not renewed (§10.1). */
export const WIN_BACK_DAYS = 30;

/**
 * Same month-day as `date`. A 29 Feb date is celebrated on 28 Feb in non-leap years, so those
 * members aren't skipped three years out of four.
 */
export function isSameDayOfYear(date: ISODate | null, today: ISODate): boolean {
  if (!date) return false;
  const md = date.slice(5);
  const todayMd = today.slice(5);
  if (md === todayMd) return true;
  const year = Number(today.slice(0, 4));
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return md === '02-29' && todayMd === '02-28' && !leap;
}

export type BucketExtras = {
  /** Members with a renewal (subscription with `renewed_from`) created today. */
  renewedToday: Set<string>;
  lastVisitByMember: Map<string, ISODate>;
  /** member → last frozen day of their open fixed freeze. */
  freezeEnds: Map<string, ISODate>;
  today: ISODate;
  expiringSoonDays: number;
};

const STATUS_BUCKET: Record<MemberSummary['status'], MemberBucket> = {
  active: 'statusActive',
  expiring: 'statusActive',
  expired: 'statusExpired',
  grace: 'statusExpired',
  frozen: 'statusFrozen',
  upcoming: 'statusUpcoming',
  noPlan: 'statusNoPlan',
};

/** Every member list on the dashboard (§10.1 Today / Attention / Membership stats). */
export function memberBuckets(members: MemberSummary[], x: BucketExtras): Record<MemberBucket, MemberSummary[]> {
  const out = Object.fromEntries(MEMBER_BUCKETS.map((b) => [b, [] as MemberSummary[]])) as Record<MemberBucket, MemberSummary[]>;
  const soonEnd = addDaysISO(x.today, x.expiringSoonDays);
  for (const m of members) {
    out.all.push(m);
    out[STATUS_BUCKET[m.status]].push(m);
    if (m.joiningDate === x.today) out.admissionsToday.push(m);
    if (x.renewedToday.has(m.id)) out.renewalsToday.push(m);
    const running = m.status === 'active' || m.status === 'expiring';
    if (running && m.daysLeft === 0) out.expiringToday.push(m);
    // "Next N days" excludes today, which has its own card.
    if (running && m.daysLeft != null && m.daysLeft >= 1 && m.daysLeft <= x.expiringSoonDays) out.expiringSoon.push(m);
    // Expired/grace means nothing current or upcoming, i.e. not renewed.
    if ((m.status === 'expired' || m.status === 'grace') && (m.daysSinceExpiry ?? Infinity) <= WIN_BACK_DAYS) out.winBack.push(m);
    if (m.duePaise > 0) out.dues.push(m);
    if (isSameDayOfYear(m.dateOfBirth, x.today)) out.birthdays.push(m);
    if (isSameDayOfYear(m.anniversaryDate, x.today)) out.anniversaries.push(m);
    const freezeEnd = x.freezeEnds.get(m.id);
    if (m.status === 'frozen' && freezeEnd && freezeEnd >= x.today && freezeEnd <= soonEnd) out.frozenEnding.push(m);
  }
  out.absent = absentees(members, x.lastVisitByMember, x.today, ABSENT_DASHBOARD_DAYS);
  out.expiringSoon.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  out.winBack.sort((a, b) => (a.daysSinceExpiry ?? 0) - (b.daysSinceExpiry ?? 0));
  out.dues.sort((a, b) => b.duePaise - a.duePaise);
  return out;
}

/** % change vs the previous period; null when there's nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** One value per day from `from` to `to`, zeros where nothing happened (chart x-axis). */
export function dailySeries(rows: { day: ISODate; value: number }[], from: ISODate, to: ISODate): { day: ISODate; value: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.value]));
  const out: { day: ISODate; value: number }[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) out.push({ day: d, value: byDay.get(d) ?? 0 });
  return out;
}

/** 24 buckets (00–23, local time) of check-in counts. */
export function peakHours(rows: { hour: number; count: number }[]): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const r of rows) if (r.hour >= 0 && r.hour < 24) hours[r.hour] = (hours[r.hour] ?? 0) + r.count;
  return hours;
}

/** Yellow "Back up now" banner (§10.1): never backed up, or older than the reminder setting. */
export function backupReminder(lastBackupAt: string | null, reminderDays: number, now: Date): { due: boolean; daysAgo: number | null } {
  if (!lastBackupAt) return { due: true, daysAgo: null };
  const daysAgo = Math.max(0, differenceInCalendarDays(now, parseISO(lastBackupAt)));
  return { due: daysAgo >= reminderDays, daysAgo };
}

export type MonthNumbers = {
  collectedPaise: Paise;
  refundedPaise: Paise;
  lastMonthCollectedPaise: Paise;
  expensesPaise: Paise;
  admissions: number;
  renewals: number;
  /** Memberships that ended this month so far, and how many of those were renewed. */
  endedThisMonth: number;
  renewedOfEnded: number;
};

/** "This month" panel: change vs last month, net profit, renewal rate (§10.1). */
export function monthSummary(n: MonthNumbers) {
  return {
    ...n,
    changePercent: percentChange(n.collectedPaise, n.lastMonthCollectedPaise),
    // Money actually kept: collections minus refunds minus expenses.
    netProfitPaise: n.collectedPaise - n.refundedPaise - n.expensesPaise,
    renewalRatePercent: n.endedThisMonth > 0 ? Math.round((n.renewedOfEnded / n.endedThisMonth) * 100) : null,
  };
}
