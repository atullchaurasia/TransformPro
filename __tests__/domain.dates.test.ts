import { addDaysISO, computeEndDate, daysBetween, isISODate, parseDay, todayISO } from '@/domain/dates';
import { planRenewal } from '@/domain/renewal';

describe('computeEndDate (§6.2)', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-28'], // short month clamps → ends on the last day
    ['2028-01-31', 1, '2028-02-29'], // leap year
    ['2026-01-30', 1, '2026-02-28'],
    ['2026-01-28', 1, '2026-02-27'],
    ['2026-03-15', 1, '2026-04-14'],
    ['2026-03-31', 1, '2026-04-30'],
    ['2026-01-01', 1, '2026-01-31'],
    ['2026-11-15', 3, '2027-02-14'], // crosses a year
    ['2026-08-31', 6, '2027-02-28'],
    ['2026-01-01', 12, '2026-12-31'],
  ])('months: %s + %i → %s', (start, n, end) => {
    expect(computeEndDate(start, { unit: 'months', value: n })).toBe(end);
  });

  it('days: start + n − 1', () => {
    expect(computeEndDate('2026-10-01', { unit: 'days', value: 1 })).toBe('2026-10-01');
    expect(computeEndDate('2026-10-01', { unit: 'days', value: 30 })).toBe('2026-10-30');
    expect(computeEndDate('2028-02-28', { unit: 'days', value: 2 })).toBe('2028-02-29');
  });

  it('years: addYears − 1 day, leap day clamps', () => {
    expect(computeEndDate('2026-04-10', { unit: 'years', value: 1 })).toBe('2027-04-09');
    expect(computeEndDate('2028-02-29', { unit: 'years', value: 1 })).toBe('2029-02-28');
  });

  it('sessions: default 90-day validity, or the plan validity', () => {
    expect(computeEndDate('2026-01-01', { unit: 'sessions', value: 12 })).toBe('2026-03-31');
    expect(computeEndDate('2026-01-01', { unit: 'sessions', value: 12, validityDays: 30 })).toBe('2026-01-30');
  });

  it('rejects bad durations and dates', () => {
    expect(() => computeEndDate('2026-01-01', { unit: 'months', value: 0 })).toThrow();
    expect(() => computeEndDate('2026-02-30', { unit: 'days', value: 1 })).toThrow();
    expect(() => parseDay('31/01/2026')).toThrow();
  });
});

describe('date helpers', () => {
  it('daysBetween and addDaysISO count calendar days across month and year boundaries', () => {
    expect(daysBetween('2026-02-27', '2026-03-01')).toBe(2);
    expect(daysBetween('2026-03-01', '2026-02-27')).toBe(-2);
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('isISODate and todayISO', () => {
    expect(isISODate('2026-10-30')).toBe(true);
    expect(isISODate('2026-13-01')).toBe(false);
    expect(isISODate(20261030)).toBe(false);
    expect(todayISO(new Date(2026, 9, 30, 23, 59))).toBe('2026-10-30');
  });
});

describe('planRenewal (§6.3)', () => {
  const monthly = { unit: 'months', value: 1 } as const;
  const previous = { id: 'old', endDate: '2026-10-31' };

  it('active/expiring: starts the day after the old end — no lost days', () => {
    const r = planRenewal({ previous, today: '2026-10-25', duration: monthly });
    expect(r).toEqual({ startDate: '2026-11-01', endDate: '2026-11-30', renewedFromSubscriptionId: 'old', wasExpired: false });
  });

  it('renewing on the last day still continues from the end', () => {
    expect(planRenewal({ previous, today: '2026-10-31', duration: monthly }).startDate).toBe('2026-11-01');
  });

  it('expired: starts today by default', () => {
    const r = planRenewal({ previous, today: '2026-11-20', duration: monthly });
    expect(r.startDate).toBe('2026-11-20');
    expect(r.endDate).toBe('2026-12-19');
    expect(r.wasExpired).toBe(true);
  });

  it('expired with "start from expiry date" backdates to the day after expiry', () => {
    expect(planRenewal({ previous, today: '2026-11-20', duration: monthly, startFromExpiry: true }).startDate).toBe('2026-11-01');
  });

  it('owner override wins', () => {
    const r = planRenewal({ previous, today: '2026-10-25', duration: monthly, overrideStartDate: '2026-10-28' });
    expect(r.startDate).toBe('2026-10-28');
    expect(r.endDate).toBe('2026-11-27');
  });
});
