// Date-only helpers (spec §6.2). Every stored date is a LOCAL calendar day 'YYYY-MM-DD'.
// All day maths goes through date-fns calendar functions — never milliseconds (CLAUDE.md §1).
import { addDays, addMonths, addYears, differenceInCalendarDays, format, getDate, isValid, parse } from 'date-fns';

import type { DurationUnit, ISODate } from '@/db/models';

/** Sessions plans are valid for this many days unless the plan says otherwise (§6.2). */
export const DEFAULT_SESSION_VALIDITY_DAYS = 90;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' → local-midnight Date. Throws on invalid input so bad data never slips into maths. */
export function parseDay(day: ISODate): Date {
  const date = ISO_DATE.test(day) ? parse(day, 'yyyy-MM-dd', new Date(2000, 0, 1)) : new Date(NaN);
  if (!isValid(date)) throw new Error(`Invalid date: ${day}`);
  return date;
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  return isValid(parse(value, 'yyyy-MM-dd', new Date(2000, 0, 1)));
}

export function formatDay(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

/** Today's local calendar date. Pass `now` in tests. */
export function todayISO(now: Date = new Date()): ISODate {
  return formatDay(now);
}

export function addDaysISO(day: ISODate, days: number): ISODate {
  return formatDay(addDays(parseDay(day), days));
}

/** Calendar days from `from` to `to` (to − from). Same day → 0. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(parseDay(to), parseDay(from));
}

/** Inclusive on both ends. */
export function isWithin(day: ISODate, start: ISODate, end: ISODate): boolean {
  return day >= start && day <= end;
}

export function maxDay(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

/**
 * Adds months/years and returns the inclusive last valid day.
 * Normally that is "same day next period − 1" (15 Mar + 1 month → 14 Apr). When the
 * target month is too short and date-fns clamps (31 Jan + 1 month → 28/29 Feb), the
 * clamped day itself is the end — the spec's example ends on 28/29 Feb, and the renewal
 * then starts 1 Mar, so no day is lost or double-counted.
 */
function addCalendarPeriod(start: Date, add: (d: Date) => Date): Date {
  const shifted = add(start);
  return getDate(shifted) !== getDate(start) ? shifted : addDays(shifted, -1);
}

export type PlanDuration = {
  unit: DurationUnit;
  value: number;
  /** Only for `sessions` plans; defaults to 90 days. */
  validityDays?: number | null;
};

/** End date (inclusive) for a plan starting on `start` (§6.2). */
export function computeEndDate(start: ISODate, duration: PlanDuration): ISODate {
  const s = parseDay(start);
  const n = duration.value;
  switch (duration.unit) {
    case 'days':
      if (!Number.isInteger(n) || n < 1) throw new Error('Duration must be at least 1 day');
      return formatDay(addDays(s, n - 1));
    case 'months':
      if (!Number.isInteger(n) || n < 1) throw new Error('Duration must be at least 1 month');
      return formatDay(addCalendarPeriod(s, (d) => addMonths(d, n)));
    case 'years':
      if (!Number.isInteger(n) || n < 1) throw new Error('Duration must be at least 1 year');
      return formatDay(addCalendarPeriod(s, (d) => addYears(d, n)));
    case 'sessions': {
      // Usage is limited by sessions_used; the date is only a validity window.
      const validity = duration.validityDays ?? DEFAULT_SESSION_VALIDITY_DAYS;
      if (!Number.isInteger(validity) || validity < 1) throw new Error('Validity must be at least 1 day');
      return formatDay(addDays(s, validity - 1));
    }
  }
}
