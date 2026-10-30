import { applyUnfreeze, checkFreeze, freezeToDate, frozenDaysOnEnd, isFreezeOver } from '@/domain/freeze';

const subscription = { startDate: '2026-10-01', endDate: '2026-10-31', status: 'active' };
const none = { timesUsed: 0, daysUsed: 0 };

describe('checkFreeze (§6.4)', () => {
  it('0 limits mean unlimited', () => {
    const r = checkFreeze({ fromDate: '2026-10-10', days: 60, subscription }, { maxFreezeDays: 0, maxFreezeTimes: 0 }, { timesUsed: 9, daysUsed: 90 }, false);
    expect(r).toMatchObject({ allowed: true, violations: [], remainingDays: null });
  });

  it('max days and max times need an override', () => {
    const limits = { maxFreezeDays: 15, maxFreezeTimes: 2 };
    expect(checkFreeze({ fromDate: '2026-10-10', days: 15, subscription }, limits, none, false).allowed).toBe(true);

    const tooLong = checkFreeze({ fromDate: '2026-10-10', days: 10, subscription }, limits, { timesUsed: 1, daysUsed: 10 }, false);
    expect(tooLong).toMatchObject({ allowed: false, violations: ['max_days'], overridable: true, remainingDays: 5 });
    expect(checkFreeze({ fromDate: '2026-10-10', days: 10, subscription }, limits, { timesUsed: 1, daysUsed: 10 }, true).allowed).toBe(true);

    const tooMany = checkFreeze({ fromDate: '2026-10-10', days: 1, subscription }, limits, { timesUsed: 2, daysUsed: 2 }, false);
    expect(tooMany.violations).toEqual(['max_times']);
  });

  it('open-ended freeze only needs some days left', () => {
    const limits = { maxFreezeDays: 15, maxFreezeTimes: 0 };
    expect(checkFreeze({ fromDate: '2026-10-10', days: null, subscription }, limits, { timesUsed: 1, daysUsed: 14 }, false).allowed).toBe(true);
    expect(checkFreeze({ fromDate: '2026-10-10', days: null, subscription }, limits, { timesUsed: 1, daysUsed: 15 }, false).allowed).toBe(false);
  });

  it('non-limit problems cannot be overridden', () => {
    const limits = { maxFreezeDays: 0, maxFreezeTimes: 0 };
    const frozen = checkFreeze({ fromDate: '2026-10-10', days: 5, subscription: { ...subscription, status: 'frozen' } }, limits, none, true);
    expect(frozen).toMatchObject({ allowed: false, overridable: false, violations: ['already_frozen'] });
    expect(checkFreeze({ fromDate: '2026-11-05', days: 5, subscription }, limits, none, true).violations).toEqual(['outside_subscription']);
    expect(checkFreeze({ fromDate: '2026-10-10', days: 0, subscription }, limits, none, true).violations).toEqual(['invalid_days']);
  });
});

describe('unfreeze', () => {
  it('fixed freeze dates and natural end', () => {
    expect(freezeToDate('2026-10-10', 10)).toBe('2026-10-19');
    expect(isFreezeOver({ toDate: '2026-10-19', endedAt: null }, '2026-10-19')).toBe(false);
    expect(isFreezeOver({ toDate: '2026-10-19', endedAt: null }, '2026-10-20')).toBe(true);
    expect(isFreezeOver({ toDate: null, endedAt: null }, '2027-01-01')).toBe(false);
    expect(frozenDaysOnEnd({ fromDate: '2026-10-10', days: 10 }, '2026-10-20')).toBe(10);
  });

  it('ending early counts only the days used; open-ended counts elapsed days', () => {
    expect(frozenDaysOnEnd({ fromDate: '2026-10-10', days: 10 }, '2026-10-14')).toBe(4);
    expect(frozenDaysOnEnd({ fromDate: '2026-10-10', days: null }, '2026-10-25')).toBe(15);
    expect(frozenDaysOnEnd({ fromDate: '2026-10-10', days: null }, '2026-10-10')).toBe(0);
  });

  it('end_date += days and frozen_days_total += days', () => {
    expect(applyUnfreeze({ endDate: '2026-10-31', frozenDaysTotal: 3 }, 10)).toEqual({
      endDate: '2026-11-10',
      frozenDaysTotal: 13,
      status: 'active',
    });
  });
});
