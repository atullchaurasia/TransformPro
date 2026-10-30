import { computeMemberStatus, computeStatus, countsAsActive, type StatusSubscription } from '@/domain/membershipStatus';

const settings = { expiringSoonDays: 7, gracePeriodDays: 3 };

let n = 0;
function sub(overrides: Partial<StatusSubscription>): StatusSubscription {
  n += 1;
  return {
    id: `s${n}`,
    planNameSnapshot: 'Monthly',
    categorySnapshot: 'membership',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: 'active',
    trainerId: null,
    sessionsTotal: null,
    sessionsUsed: 0,
    ...overrides,
  };
}

describe('computeStatus (§6.1)', () => {
  it('no plan', () => {
    expect(computeStatus([], [], '2026-10-15', settings).status).toBe('noPlan');
    // cancelled subscriptions are ignored
    expect(computeStatus([sub({ status: 'cancelled' })], [], '2026-10-15', settings).status).toBe('noPlan');
    // PT doesn't count as a membership
    expect(computeStatus([sub({ categorySnapshot: 'personal_training' })], [], '2026-10-15', settings).status).toBe('noPlan');
  });

  it('active with days left; start and end days are inclusive', () => {
    const s = [sub({})];
    expect(computeStatus(s, [], '2026-10-01', settings)).toMatchObject({ status: 'active', daysLeft: 30, planName: 'Monthly' });
    expect(computeStatus(s, [], '2026-10-23', settings)).toMatchObject({ status: 'active', daysLeft: 8 });
  });

  it('expiring-soon boundary: end − today ≤ expiring_soon_days', () => {
    const s = [sub({})];
    expect(computeStatus(s, [], '2026-10-24', settings)).toMatchObject({ status: 'expiring', daysLeft: 7 });
    expect(computeStatus(s, [], '2026-10-31', settings)).toMatchObject({ status: 'expiring', daysLeft: 0 });
  });

  it('an early renewal means not expiring soon', () => {
    const s = [sub({}), sub({ startDate: '2026-11-01', endDate: '2026-11-30' })];
    expect(computeStatus(s, [], '2026-10-28', settings)).toMatchObject({ status: 'active', coveredUntil: '2026-11-30', daysLeft: 33 });
  });

  it('grace boundaries, then expired', () => {
    const s = [sub({})];
    expect(computeStatus(s, [], '2026-11-01', settings)).toMatchObject({ status: 'grace', daysSinceExpiry: 1 });
    expect(computeStatus(s, [], '2026-11-03', settings)).toMatchObject({ status: 'grace', daysSinceExpiry: 3 });
    expect(computeStatus(s, [], '2026-11-04', settings)).toMatchObject({ status: 'expired', daysSinceExpiry: 4 });
    expect(computeStatus(s, [], '2026-11-01', { ...settings, gracePeriodDays: 0 }).status).toBe('expired');
  });

  it('upcoming when the only subscription starts later', () => {
    expect(computeStatus([sub({ startDate: '2026-11-01', endDate: '2026-11-30' })], [], '2026-10-20', settings).status).toBe('upcoming');
  });

  it('expired member with a future renewal is upcoming', () => {
    const s = [sub({}), sub({ startDate: '2026-11-20', endDate: '2026-12-19' })];
    expect(computeStatus(s, [], '2026-11-10', settings).status).toBe('upcoming');
  });

  it('frozen by status or by an open freeze — even past the old end date', () => {
    const s1 = [sub({ status: 'frozen' })];
    expect(computeStatus(s1, [], '2026-11-10', settings).status).toBe('frozen');
    const s2 = sub({});
    expect(computeStatus([s2], [{ subscriptionId: s2.id, endedAt: null }], '2026-10-10', settings).status).toBe('frozen');
    expect(computeStatus([s2], [{ subscriptionId: s2.id, endedAt: '2026-10-05T00:00:00Z' }], '2026-10-10', settings).status).toBe('active');
  });

  it('session plans: sessions left, and used up = expired', () => {
    const live = sub({ sessionsTotal: 12, sessionsUsed: 5, endDate: '2026-12-29' });
    expect(computeStatus([live], [], '2026-10-10', settings)).toMatchObject({ status: 'active', sessionsLeft: 7 });
    const done = sub({ sessionsTotal: 12, sessionsUsed: 12, endDate: '2026-12-29' });
    expect(computeStatus([done], [], '2026-10-10', settings)).toMatchObject({ status: 'expired', sessionsLeft: 0 });
  });

  it('grace counts as active for check-in', () => {
    expect(countsAsActive('grace')).toBe(true);
    expect(countsAsActive('expired')).toBe(false);
    expect(countsAsActive('frozen')).toBe(false);
  });
});

describe('computeMemberStatus', () => {
  it('PT and services have their own status; trainer comes from the PT plan', () => {
    const subs = [
      sub({}),
      sub({ categorySnapshot: 'personal_training', planNameSnapshot: 'PT Monthly', trainerId: 't1', endDate: '2026-10-10' }),
      sub({ categorySnapshot: 'service', planNameSnapshot: 'Locker' }),
    ];
    const during = computeMemberStatus(subs, [], '2026-10-05', settings, 't9');
    expect(during.membership.status).toBe('active');
    expect(during.personalTraining.status).toBe('expiring');
    expect(during.services.planName).toBe('Locker');
    expect(during.trainerId).toBe('t1');
    // PT over → falls back to the assigned trainer
    expect(computeMemberStatus(subs, [], '2026-10-20', settings, 't9').trainerId).toBe('t9');
  });
});
