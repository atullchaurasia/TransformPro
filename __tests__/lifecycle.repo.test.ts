import { freezesRepo, paymentsRepo, subscriptionsRepo } from '@/db/repositories';
import { listMemberAudit, loadMemberProfileData } from '@/db/repositories/memberProfile';
import { insertPayment } from '@/db/repositories/payments';
import {
  addSubscription,
  cancelSubscription,
  changePlan,
  closeFinishedFreezes,
  deleteSubscription,
  endFreeze,
  extendSubscription,
  freezeSubscription,
  SubscriptionHasPaymentsError,
  updateSubscription,
} from '@/db/repositories/subscriptions';
import { draftSubscription, newLine, planNewMemberPayment } from '@/domain/newMember';

import { addMember, addSubscription as addSubRow, migratedDb, seedBasics } from './helpers/fixtures';

const noTax = { enabled: false, percent: 18, inclusive: true };
const cash = { mode: 'cash' as const, reference: null, paidOn: '2026-10-15', note: null };

async function setup() {
  const db = await migratedDb();
  const { plan } = await seedBasics(db);
  const member = await addMember(db);
  const current = await addSubRow(db, member.id, plan.id); // 1 Oct → 31 Oct, ₹1,500
  return { db, plan, member, current };
}

describe('renew / add plan', () => {
  it('creates the renewal linked to the old plan, applies advances, records payment + audit', async () => {
    const { db, plan, member, current } = await setup();
    await insertPayment(db, { member, subscription: null, amountPaise: 50000, details: cash, receivedBy: null, isRefund: false, currency: 'INR' }); // advance
    const { price: _p, ...draft } = draftSubscription(newLine(plan, '2026-11-01'), noTax);
    const pay = planNewMemberPayment([{ totalPaise: draft.totalPaise - 50000 }], 100000, false);
    if (!pay.ok) throw new Error('plan');

    const r = await addSubscription(db, { member, draft, renewedFromSubscriptionId: current.id, payment: { ...cash, plan: pay.plan }, createdBy: null, currency: 'INR', kind: 'renew' });
    expect(r.subscription).toMatchObject({ startDate: '2026-11-01', endDate: '2026-11-30', renewedFromSubscriptionId: current.id });
    expect(r.advanceAppliedPaise).toBe(50000);
    expect(r.payments.map((p) => [p.subscriptionId, p.amountPaise])).toEqual([[r.subscription.id, 100000]]);

    const data = await loadMemberProfileData(db, member.id, { from: '2026-10-01', to: '2026-10-31' });
    expect(data?.payments.filter((p) => p.subscriptionId === r.subscription.id).length).toBe(2);
    const audit = await listMemberAudit(db, member.id);
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(['subscription.renew', 'payment.update', 'payment.create']));
  });

  it('change plan ends the old plan yesterday and starts the new one, linked', async () => {
    const { db, plan, member, current } = await setup();
    const { price: _p, ...draft } = draftSubscription(newLine({ ...plan, name: 'Quarterly', durationValue: 3 }, '2026-10-15'), noTax);
    const r = await changePlan(db, current, '2026-10-14', { member, draft, payment: null, createdBy: null, currency: 'INR' });
    expect(await subscriptionsRepo.getById(db, current.id)).toMatchObject({ endDate: '2026-10-14', status: 'completed' });
    expect(r.subscription).toMatchObject({ startDate: '2026-10-15', endDate: '2027-01-14', renewedFromSubscriptionId: current.id, planNameSnapshot: 'Quarterly' });
  });
});

describe('freeze / unfreeze (§6.4)', () => {
  it('a freeze extends the end date by the frozen days', async () => {
    const { db, member, current } = await setup();
    const f = await freezeSubscription(db, { member, sub: current, fromDate: '2026-10-10', days: null, reason: 'Travel', overridden: false, createdBy: null });
    expect((await subscriptionsRepo.getById(db, current.id))?.status).toBe('frozen');
    const frozen = (await subscriptionsRepo.getById(db, current.id))!;
    const after = await endFreeze(db, { member, sub: frozen, freeze: f, days: 5, toDate: '2026-10-14' });
    expect(after).toMatchObject({ endDate: '2026-11-05', frozenDaysTotal: 5, status: 'active' });
    expect((await freezesRepo.getById(db, f.id))?.endedAt).not.toBeNull();
  });

  it('fixed freezes close by themselves once their last day has passed', async () => {
    const { db, member, current } = await setup();
    await freezeSubscription(db, { member, sub: current, fromDate: '2026-10-05', days: 7, reason: null, overridden: false, createdBy: null });
    expect(await closeFinishedFreezes(db, '2026-10-11')).toBe(0); // last frozen day is the 11th
    expect(await closeFinishedFreezes(db, '2026-10-12')).toBe(1);
    expect(await subscriptionsRepo.getById(db, current.id)).toMatchObject({ endDate: '2026-11-07', frozenDaysTotal: 7, status: 'active' });
    expect(await closeFinishedFreezes(db, '2026-10-20')).toBe(0);
  });
});

describe('extend / cancel / edit / delete', () => {
  it('extend moves the end date and logs the reason', async () => {
    const { db, member, current } = await setup();
    expect((await extendSubscription(db, { member, sub: current, newEndDate: '2026-11-03', reason: 'Gym closed 3 days' })).endDate).toBe('2026-11-03');
    const [entry] = await listMemberAudit(db, member.id);
    expect(entry.summary).toContain('Gym closed 3 days');
  });

  it('cancel with refund ends open freezes, records a refund row and owes nothing', async () => {
    const { db, member, current } = await setup();
    await insertPayment(db, { member, subscription: current, amountPaise: 100000, details: cash, receivedBy: null, isRefund: false, currency: 'INR' });
    await freezeSubscription(db, { member, sub: current, fromDate: '2026-10-10', days: null, reason: null, overridden: false, createdBy: null });
    const r = await cancelSubscription(db, { member, sub: current, reason: 'Moved city', refund: { amountPaise: 40000, details: cash }, receivedBy: null, currency: 'INR' });
    expect(r.subscription).toMatchObject({ status: 'cancelled', cancelledReason: 'Moved city', refundPaise: 40000 });
    expect(r.refund).toMatchObject({ isRefund: true, amountPaise: 40000, subscriptionId: current.id });
    const open = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM freezes WHERE ended_at IS NULL', []);
    expect(open?.n).toBe(0);
  });

  it('edit updates price fields; delete only without payments', async () => {
    const { db, member, current } = await setup();
    expect((await updateSubscription(db, { member, sub: current, patch: { totalPaise: 120000, discountPaise: 30000, discountReason: 'Student' }, currency: 'INR' })).totalPaise).toBe(120000);
    const p = await insertPayment(db, { member, subscription: current, amountPaise: 1000, details: cash, receivedBy: null, isRefund: false, currency: 'INR' });
    await paymentsRepo.softDelete(db, p.id); // even a deleted payment still blocks the delete
    await expect(deleteSubscription(db, { member, sub: current })).rejects.toThrow(SubscriptionHasPaymentsError);
    const other = await addSubRow(db, member.id, current.planId, { startDate: '2026-11-01', endDate: '2026-11-30' });
    await deleteSubscription(db, { member, sub: other });
    expect(await subscriptionsRepo.getById(db, other.id)).toBeNull();
  });
});

describe('profile data', () => {
  it('loads referrals, last visit and visits this month', async () => {
    const { db, member } = await setup();
    await addMember(db, { memberCode: 'TP0002', fullName: 'Priya', phone: '919800000002', referredByMemberId: member.id });
    for (const date of ['2026-09-30', '2026-10-02', '2026-10-05']) {
      await db.runAsync("INSERT INTO attendance (id, member_id, date, check_in_at, method, created_at, updated_at) VALUES (?, ?, ?, ?, 'manual', '', '')", [date, member.id, date, `${date}T10:00:00Z`]);
    }
    const data = await loadMemberProfileData(db, member.id, { from: '2026-10-01', to: '2026-10-31' });
    expect(data).toMatchObject({ lastVisit: '2026-10-05', visitsThisMonth: 2, referredBy: null });
    expect(data?.referrals.map((r) => r.fullName)).toEqual(['Priya']);
  });
});
