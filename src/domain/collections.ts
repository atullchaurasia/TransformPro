// Payments tab maths (spec §10.5): date presets, totals by mode, the dues list.
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, subMonths } from 'date-fns';

import type { ISODate, Paise, PaymentMode, Subscription } from '@/db/models';

import { addDaysISO, formatDay, parseDay } from './dates';
import { dueFromNet } from './dues';
import type { WeekStart } from './settings';

export type RangePreset = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';
export const RANGE_PRESETS: RangePreset[] = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'lastMonth', 'custom'];

export type DayRange = { from: ISODate; to: ISODate };

/** Inclusive date range for a filter chip. `custom` uses the given range (swapped if reversed). */
export function rangeFor(preset: RangePreset, today: ISODate, weekStart: WeekStart, custom?: DayRange): DayRange {
  const d = parseDay(today);
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const y = addDaysISO(today, -1);
      return { from: y, to: y };
    }
    case 'thisWeek': {
      const opts = { weekStartsOn: weekStart === 'monday' ? (1 as const) : (0 as const) };
      return { from: formatDay(startOfWeek(d, opts)), to: formatDay(endOfWeek(d, opts)) };
    }
    case 'thisMonth':
      return { from: formatDay(startOfMonth(d)), to: formatDay(endOfMonth(d)) };
    case 'lastMonth': {
      const m = subMonths(d, 1);
      return { from: formatDay(startOfMonth(m)), to: formatDay(endOfMonth(m)) };
    }
    case 'custom': {
      const r = custom ?? { from: today, to: today };
      return r.from <= r.to ? r : { from: r.to, to: r.from };
    }
  }
}

export type ModeTotal = { mode: PaymentMode; amountPaise: Paise; count: number };

/** Totals by payment mode, biggest first, plus the grand total (§10.5 Collections). */
export function totalsByMode(rows: { mode: PaymentMode; amountPaise: Paise }[]): { byMode: ModeTotal[]; totalPaise: Paise; count: number } {
  const map = new Map<PaymentMode, ModeTotal>();
  for (const r of rows) {
    const t = map.get(r.mode) ?? { mode: r.mode, amountPaise: 0, count: 0 };
    t.amountPaise += r.amountPaise;
    t.count += 1;
    map.set(r.mode, t);
  }
  const byMode = [...map.values()].sort((a, b) => b.amountPaise - a.amountPaise);
  return { byMode, totalPaise: byMode.reduce((s, t) => s + t.amountPaise, 0), count: rows.length };
}

export type DuesSort = 'amount' | 'oldest';

export type DueMember = {
  id: string;
  fullName: string;
  memberCode: string;
  phone: string;
  photoUri: string | null;
  duePaise: Paise;
  /** Start date of the oldest plan that still has money due. */
  oldestSince: ISODate | null;
};

/**
 * Members with a balance (§10.5 Dues). `duePaise` already nets off unapplied advances
 * (`memberDues`); the "oldest" date comes from the oldest plan still owing money.
 */
export function buildDuesList(
  members: Omit<DueMember, 'oldestSince'>[],
  subscriptions: Pick<Subscription, 'id' | 'memberId' | 'startDate' | 'totalPaise' | 'status'>[],
  netPaidBySubscription: Map<string, Paise>,
  sort: DuesSort,
): { members: DueMember[]; totalPaise: Paise } {
  const oldest = new Map<string, ISODate>();
  for (const s of subscriptions) {
    if (dueFromNet(s, netPaidBySubscription.get(s.id) ?? 0) <= 0) continue;
    const prev = oldest.get(s.memberId);
    if (!prev || s.startDate < prev) oldest.set(s.memberId, s.startDate);
  }
  const list = members.filter((m) => m.duePaise > 0).map((m) => ({ ...m, oldestSince: oldest.get(m.id) ?? null }));
  list.sort((a, b) =>
    sort === 'amount'
      ? b.duePaise - a.duePaise || a.fullName.localeCompare(b.fullName)
      : (a.oldestSince ?? '9999').localeCompare(b.oldestSince ?? '9999') || b.duePaise - a.duePaise,
  );
  return { members: list, totalPaise: list.reduce((s, m) => s + m.duePaise, 0) };
}
