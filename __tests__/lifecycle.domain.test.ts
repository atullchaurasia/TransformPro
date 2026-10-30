import type { Freeze, Subscription } from '@/db/models';
import {
  checkChangePlan,
  planActionsFor,
  prorationCredit,
  renewalTarget,
  subscriptionProgress,
  subscriptionState,
  unfreezeOutcome,
  validateCancel,
  validateExtension,
  validateSubscriptionEdit,
} from '@/domain/lifecycle';
import { buildMemberProfile } from '@/domain/memberProfile';
import { planRenewal } from '@/domain/renewal';

const today = '2026-10-15';

function sub(id: string, extra: Partial<Subscription> = {}): Subscription {
  return {
    id,
    memberId: 'm',
    planId: 'p',
    branchId: null,
    planNameSnapshot: 'Monthly',
    categorySnapshot: 'membership',
    startDate: '2026-10-01',
    endDate: '2026-10-30',
    sessionsTotal: null,
    sessionsUsed: 0,
    basePricePaise: 300000,
    admissionFeePaise: 0,
    discountPaise: 0,
    discountReason: null,
    taxPaise: 0,
    totalPaise: 300000,
    trainerId: null,
    status: 'active',
    frozenDaysTotal: 0,
    renewedFromSubscriptionId: null,
    cancelledReason: null,
    cancelledAt: null,
    refundPaise: null,
    createdBy: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...extra,
  };
}

const opts = { openFreeze: false, renewed: false, today, expiringSoonDays: 7 };

describe('subscriptionState / progress / renewal target', () => {
  it('labels each plan in the timeline', () => {
    expect(subscriptionState(sub('a'), opts)).toBe('active');
    expect(subscriptionState(sub('a', { endDate: '2026-10-20' }), opts)).toBe('expiring');
    expect(subscriptionState(sub('a', { endDate: '2026-10-20' }), { ...opts, renewed: true })).toBe('active');
    expect(subscriptionState(sub('a'), { ...opts, openFreeze: true })).toBe('frozen');
    expect(subscriptionState(sub('a', { startDate: '2026-11-01', endDate: '2026-11-30' }), opts)).toBe('upcoming');
    expect(subscriptionState(sub('a', { endDate: '2026-10-10' }), opts)).toBe('expired');
    expect(subscriptionState(sub('a', { sessionsTotal: 10, sessionsUsed: 10 }), opts)).toBe('completed');
    expect(subscriptionState(sub('a', { status: 'cancelled' }), opts)).toBe('cancelled');
  });

  it('progress is the used share of the plan', () => {
    expect(subscriptionProgress(sub('a'), '2026-10-15')).toBeCloseTo(15 / 30);
    expect(subscriptionProgress(sub('a'), '2026-09-01')).toBe(0);
    expect(subscriptionProgress(sub('a'), '2026-12-01')).toBe(1);
  });

  it('renews the plan that ends last; renewing an active plan starts the day after it ends', () => {
    const subs = [sub('old', { startDate: '2026-09-01', endDate: '2026-09-30' }), sub('cur'), sub('x', { status: 'cancelled', endDate: '2026-12-31' })];
    const target = renewalTarget(subs);
    expect(target?.id).toBe('cur');
    const r = planRenewal({ previous: target!, today, duration: { unit: 'months', value: 1 } });
    expect(r).toMatchObject({ startDate: '2026-10-31', endDate: '2026-11-30', wasExpired: false });
    expect(renewalTarget(subs, 'personal_training')).toBeNull();
  });
});

describe('change plan + proration (§10.2)', () => {
  it('only running plans can be changed', () => {
    expect(checkChangePlan(sub('a'), today, false)).toEqual({ ok: true, oldEndDate: '2026-10-14', newStartDate: today });
    expect(checkChangePlan(sub('a', { startDate: today }), today, false)).toEqual({ ok: false, reason: 'starts_today' });
    expect(checkChangePlan(sub('a', { startDate: '2026-11-01' }), today, false)).toEqual({ ok: false, reason: 'not_started' });
    expect(checkChangePlan(sub('a', { endDate: '2026-10-10' }), today, false)).toEqual({ ok: false, reason: 'ended' });
    expect(checkChangePlan(sub('a'), today, true)).toEqual({ ok: false, reason: 'frozen' });
    expect(checkChangePlan(sub('a', { status: 'cancelled' }), today, false)).toEqual({ ok: false, reason: 'not_current' });
  });

  it('credit = unused share of the old total (days, or sessions for session plans)', () => {
    // 30-day plan, change on day 15 → days 15..30 unused = 16 days.
    expect(prorationCredit(sub('a'), today)).toEqual({ unusedDays: 16, totalDays: 30, unusedSessions: null, creditPaise: 160000 });
    const pt = sub('pt', { sessionsTotal: 12, sessionsUsed: 3, totalPaise: 600000 });
    expect(prorationCredit(pt, today).creditPaise).toBe(450000);
  });
});

describe('extend / cancel / edit checks', () => {
  it('extend needs a later date and a reason', () => {
    expect(validateExtension('2026-10-30', '2026-10-30', 'x')).toBe('not_later');
    expect(validateExtension('2026-10-30', null, 'x')).toBe('not_later');
    expect(validateExtension('2026-10-30', '2026-11-05', '  ')).toBe('reason_required');
    expect(validateExtension('2026-10-30', '2026-11-05', 'Gym closed for Diwali')).toBeNull();
  });

  it('cancel needs a reason and a refund within what was paid', () => {
    expect(validateCancel('', 0, 0)).toBe('reason_required');
    expect(validateCancel('Moved city', 5000, 4000)).toBe('refund_too_large');
    expect(validateCancel('Moved city', -1, 4000)).toBe('invalid_refund');
    expect(validateCancel('Moved city', 4000, 4000)).toBeNull();
  });

  it('edit cannot go below what was paid', () => {
    expect(validateSubscriptionEdit(100000, 150000)).toBe('below_paid');
    expect(validateSubscriptionEdit(150000, 150000)).toBeNull();
  });
});

describe('planActionsFor', () => {
  const all = { renew: true, freeze: true, editDates: true, create: true, cancel: true, owner: true };
  const row = { state: 'active' as const, category: 'membership' as const, isLatestOfCategory: true, hasOpenFreeze: false, canChangePlan: true, paymentRows: 1 };
  it('offers actions that fit the state and the permissions', () => {
    expect(planActionsFor(row, all)).toEqual(['renew', 'freeze', 'extend', 'changePlan', 'edit', 'cancel']);
    expect(planActionsFor({ ...row, state: 'frozen', hasOpenFreeze: true, canChangePlan: false, paymentRows: 0 }, all)).toEqual(['renew', 'unfreeze', 'extend', 'edit', 'cancel', 'delete']);
    expect(planActionsFor({ ...row, state: 'cancelled', canChangePlan: false }, all)).toEqual([]);
    expect(planActionsFor({ ...row, category: 'service', isLatestOfCategory: false }, { ...all, editDates: false, cancel: false })).toEqual(['changePlan']);
    expect(planActionsFor(row, { renew: true, freeze: false, editDates: false, create: false, cancel: false, owner: false })).toEqual(['renew']);
  });
});

describe('unfreezeOutcome (§6.4)', () => {
  it('counts days frozen; open-ended freezes are capped by the plan limit unless overridden', () => {
    expect(unfreezeOutcome({ fromDate: '2026-10-05', days: 10 }, '2026-10-10', null, false)).toEqual({ days: 5, toDate: '2026-10-09', capped: false });
    expect(unfreezeOutcome({ fromDate: '2026-10-05', days: null }, '2026-10-15', 7, false)).toEqual({ days: 7, toDate: '2026-10-11', capped: true });
    expect(unfreezeOutcome({ fromDate: '2026-10-05', days: null }, '2026-10-15', 7, true)).toEqual({ days: 10, toDate: '2026-10-14', capped: false });
    expect(unfreezeOutcome({ fromDate: '2026-10-15', days: null }, '2026-10-15', null, false)).toEqual({ days: 0, toDate: null, capped: false });
  });
});

describe('buildMemberProfile', () => {
  it('rows newest first with paid/due, freezes and payment counts; lifetime paid nets refunds', () => {
    const subs = [
      sub('old', { startDate: '2026-09-01', endDate: '2026-09-30', status: 'completed' }),
      sub('cur', { renewedFromSubscriptionId: 'old' }),
      sub('steam', { categorySnapshot: 'service', totalPaise: 20000, startDate: today, endDate: today }),
    ];
    const freeze: Freeze = { id: 'f', subscriptionId: 'cur', memberId: 'm', fromDate: '2026-10-10', toDate: null, days: null, reason: null, createdBy: null, endedAt: null, createdAt: '', updatedAt: '' };
    const pay = (id: string, subscriptionId: string | null, amountPaise: number, extra: { isRefund?: boolean; deletedAt?: string | null } = {}) => ({
      id,
      subscriptionId,
      amountPaise,
      isRefund: extra.isRefund ?? false,
      deletedAt: extra.deletedAt ?? null,
      paidOn: '2026-10-01',
      createdAt: id,
    });
    const p = buildMemberProfile({
      assignedTrainerId: null,
      subscriptions: subs,
      freezes: [freeze],
      payments: [pay('1', 'old', 300000), pay('2', 'cur', 100000), pay('3', 'cur', 50000, { deletedAt: 'x' }), pay('4', 'old', 10000, { isRefund: true })],
      today,
      settings: { expiringSoonDays: 7, gracePeriodDays: 0 },
    });
    expect(p.rows.map((r) => [r.sub.id, r.state])).toEqual([
      ['steam', 'expiring'],
      ['cur', 'frozen'],
      ['old', 'completed'],
    ]);
    const cur = p.rows[1];
    expect(cur).toMatchObject({ netPaidPaise: 100000, duePaise: 200000, freezeCount: 1, paymentRows: 2 });
    expect(p.status.membership.status).toBe('frozen');
    expect(p.lifetimePaidPaise).toBe(390000);
    expect(p.dues.totalDuePaise).toBe(10000 + 200000 + 20000);
    expect(p.currentServices.map((r) => r.sub.id)).toEqual(['steam']);
  });
});
