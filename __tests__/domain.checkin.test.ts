import { evaluateCheckin, staleCheckins, type CheckinInput } from '@/domain/checkin';
import type { MembershipStatus, StatusResult } from '@/domain/membershipStatus';

function membership(status: MembershipStatus, session?: { total: number; used: number }): StatusResult {
  return {
    status,
    subscription: {
      id: 'sub1',
      planNameSnapshot: 'Monthly',
      categorySnapshot: 'membership',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      status: 'active',
      trainerId: null,
      sessionsTotal: session?.total ?? null,
      sessionsUsed: session?.used ?? 0,
    },
    daysLeft: 10,
    daysSinceExpiry: null,
    coveredUntil: null,
    planName: 'Monthly',
    sessionsLeft: session ? session.total - session.used : null,
  };
}

const base: CheckinInput = {
  membership: membership('active'),
  duePaise: 0,
  todayVisits: [],
  settings: { blockExpired: true, blockDues: false, allowMultiplePerDay: false },
  canOverride: false,
};

describe('evaluateCheckin (§6.8)', () => {
  it('active member checks in', () => {
    expect(evaluateCheckin(base)).toEqual({ kind: 'check_in', warnings: [], consumeSessionOf: null });
  });

  it('expired is blocked only when the setting is on; owners can override', () => {
    expect(evaluateCheckin({ ...base, membership: membership('expired') })).toMatchObject({ kind: 'blocked', reasons: ['expired'], overridable: false });
    expect(evaluateCheckin({ ...base, membership: membership('expired'), canOverride: true })).toMatchObject({ overridable: true });
    const off = { ...base.settings, blockExpired: false };
    expect(evaluateCheckin({ ...base, settings: off, membership: membership('expired') }).kind).toBe('check_in');
    expect(evaluateCheckin({ ...base, membership: membership('noPlan') })).toMatchObject({ reasons: ['no_plan'] });
    expect(evaluateCheckin({ ...base, membership: membership('upcoming') })).toMatchObject({ reasons: ['upcoming'] });
  });

  it('frozen is always blocked', () => {
    const off = { ...base.settings, blockExpired: false };
    expect(evaluateCheckin({ ...base, settings: off, membership: membership('frozen') })).toMatchObject({ kind: 'blocked', reasons: ['frozen'] });
  });

  it('grace counts as active with a warning; expiring warns', () => {
    expect(evaluateCheckin({ ...base, membership: membership('grace') })).toEqual({ kind: 'check_in', warnings: ['grace'], consumeSessionOf: null });
    expect(evaluateCheckin({ ...base, membership: membership('expiring') })).toMatchObject({ kind: 'check_in', warnings: ['expiring'] });
  });

  it('dues warn by default and block when the setting is on', () => {
    expect(evaluateCheckin({ ...base, duePaise: 500 })).toMatchObject({ kind: 'check_in', warnings: ['dues'] });
    const blockDues = { ...base.settings, blockDues: true };
    expect(evaluateCheckin({ ...base, settings: blockDues, duePaise: 500 })).toMatchObject({ kind: 'blocked', reasons: ['dues'] });
  });

  it('already inside today → offer check out', () => {
    const visit = { id: 'v1', checkInAt: '2026-10-30T12:00:00.000Z', checkOutAt: null };
    expect(evaluateCheckin({ ...base, todayVisits: [visit] })).toEqual({ kind: 'check_out', visitId: 'v1' });
  });

  it('one visit per day unless multiple are allowed', () => {
    const done = { id: 'v1', checkInAt: '2026-10-30T06:00:00.000Z', checkOutAt: '2026-10-30T07:00:00.000Z' };
    expect(evaluateCheckin({ ...base, todayVisits: [done] })).toMatchObject({ kind: 'blocked', reasons: ['already_checked_in'] });
    const multi = { ...base.settings, allowMultiplePerDay: true };
    expect(evaluateCheckin({ ...base, settings: multi, todayVisits: [done] }).kind).toBe('check_in');
  });

  it('session plans use a session and block at 0 left — even with expired-blocking off', () => {
    expect(evaluateCheckin({ ...base, membership: membership('active', { total: 12, used: 11 }) })).toMatchObject({ kind: 'check_in', consumeSessionOf: 'sub1' });
    const off = { ...base.settings, blockExpired: false };
    const exhausted = evaluateCheckin({ ...base, settings: off, membership: membership('expired', { total: 12, used: 12 }), canOverride: true });
    expect(exhausted).toMatchObject({ kind: 'blocked', reasons: ['no_sessions_left'], consumeSessionOf: null });
  });
});

describe('staleCheckins (auto check-out)', () => {
  it('closes check-ins older than the limit at check-in + hours', () => {
    const now = new Date('2026-10-30T12:00:00.000Z');
    const open = [
      { id: 'old', checkInAt: '2026-10-30T08:00:00.000Z', checkOutAt: null },
      { id: 'edge', checkInAt: '2026-10-30T09:00:00.000Z', checkOutAt: null },
      { id: 'fresh', checkInAt: '2026-10-30T10:00:00.000Z', checkOutAt: null },
      { id: 'closed', checkInAt: '2026-10-30T01:00:00.000Z', checkOutAt: '2026-10-30T02:00:00.000Z' },
    ];
    expect(staleCheckins(open, now, 3)).toEqual([
      { id: 'old', checkOutAt: '2026-10-30T11:00:00.000Z' },
      { id: 'edge', checkOutAt: '2026-10-30T12:00:00.000Z' },
    ]);
    expect(staleCheckins(open, now, 0)).toEqual([]);
  });
});
