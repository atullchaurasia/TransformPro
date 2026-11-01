// Attendance maths (spec §10.4, profile Attendance tab): visit durations, streak, monthly
// counts, the month calendar grid, absentees and QR scan debounce. Pure, unit-tested.
import { differenceInMinutes, endOfMonth, endOfWeek, parseISO, startOfMonth, startOfWeek } from 'date-fns';

import type { Attendance, ISODate } from '@/db/models';

import { addDaysISO, daysBetween, formatDay, parseDay } from './dates';
import type { WeekStart } from './settings';

type Visit = Pick<Attendance, 'date' | 'checkInAt' | 'checkOutAt'>;

/** Minutes between check-in and check-out; null while still inside. */
export function visitMinutes(v: Pick<Attendance, 'checkInAt' | 'checkOutAt'>): number | null {
  if (!v.checkOutAt) return null;
  return Math.max(0, differenceInMinutes(parseISO(v.checkOutAt), parseISO(v.checkInAt)));
}

export type AttendanceStats = {
  /** 'YYYY-MM' → visits that month (one per check-in). */
  visitsByMonth: Map<string, number>;
  /** Consecutive days with a visit, ending today (or yesterday if not in yet today). */
  streak: number;
  /** Average of completed visits, rounded; null if none were checked out. */
  averageMinutes: number | null;
  visitedDays: Set<ISODate>;
};

export function attendanceStats(visits: Visit[], today: ISODate): AttendanceStats {
  const visitsByMonth = new Map<string, number>();
  const visitedDays = new Set<ISODate>();
  let total = 0;
  let completed = 0;
  for (const v of visits) {
    const month = v.date.slice(0, 7);
    visitsByMonth.set(month, (visitsByMonth.get(month) ?? 0) + 1);
    visitedDays.add(v.date);
    const m = visitMinutes(v);
    if (m != null) {
      total += m;
      completed += 1;
    }
  }
  // A streak isn't broken just because today's visit hasn't happened yet.
  let day = visitedDays.has(today) ? today : addDaysISO(today, -1);
  let streak = 0;
  while (visitedDays.has(day)) {
    streak += 1;
    day = addDaysISO(day, -1);
  }
  return { visitsByMonth, streak, averageMinutes: completed ? Math.round(total / completed) : null, visitedDays };
}

export type CalendarDay = { date: ISODate; inMonth: boolean; visited: boolean; isToday: boolean };

/** Weeks (rows of 7) covering `month` ('YYYY-MM'), starting on the gym's week start. */
export function monthGrid(month: string, weekStart: WeekStart, visited: Set<ISODate>, today: ISODate): CalendarDay[][] {
  const first = parseDay(`${month}-01`);
  const opts = { weekStartsOn: weekStart === 'monday' ? (1 as const) : (0 as const) };
  let day = formatDay(startOfWeek(startOfMonth(first), opts));
  const last = formatDay(endOfWeek(endOfMonth(first), opts));
  const weeks: CalendarDay[][] = [];
  while (day <= last) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: day, inMonth: day.startsWith(month), visited: visited.has(day), isToday: day === today });
      day = addDaysISO(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export type TodayFilter = 'all' | 'inside' | 'left';

export function filterToday<T extends Pick<Attendance, 'checkOutAt'>>(rows: T[], filter: TodayFilter): T[] {
  if (filter === 'inside') return rows.filter((r) => r.checkOutAt == null);
  if (filter === 'left') return rows.filter((r) => r.checkOutAt != null);
  return rows;
}

export const ABSENT_DAYS = [7, 14, 30] as const;

export type Absentee<M> = M & { lastVisit: ISODate | null; daysAway: number };

/**
 * Active members (incl. expiring and grace) not seen for at least `days` days (§10.4). Members
 * who never came count from their joining date, so a brand-new member isn't listed at once.
 */
export function absentees<M extends { id: string; joiningDate: ISODate; status: string }>(
  members: M[],
  lastVisitByMember: Map<string, ISODate>,
  today: ISODate,
  days: number,
): Absentee<M>[] {
  const active = new Set(['active', 'expiring', 'grace']);
  return members
    .filter((m) => active.has(m.status))
    .map((m) => {
      const lastVisit = lastVisitByMember.get(m.id) ?? null;
      return { ...m, lastVisit, daysAway: daysBetween(lastVisit ?? m.joiningDate, today) };
    })
    .filter((m) => m.daysAway >= days)
    .sort((a, b) => b.daysAway - a.daysAway);
}

/** The same QR code within `windowMs` of its last scan is ignored (§10.4: debounce 5 s). */
export function shouldIgnoreScan(lastSeen: Map<string, number>, code: string, now: number, windowMs = 5000): boolean {
  const prev = lastSeen.get(code);
  return prev != null && now - prev < windowMs;
}
