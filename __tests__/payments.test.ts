import { paymentsRepo } from '@/db/repositories';
import { listMemberPaymentRows, listPaymentsInRange, listPurgeablePayments, listTrashedPayments, loadReceiptData } from '@/db/repositories/paymentList';
import { deletePaymentPermanently, recordPayment, recordRefund, restorePayment, softDeletePayment } from '@/db/repositories/payments';
import { buildDuesList, rangeFor, totalsByMode } from '@/domain/collections';
import { allocatePayment, memberDues } from '@/domain/dues';
import { buildReceipt } from '@/domain/receipt';
import { escapeHtml, renderReceiptHtml, type ReceiptLabels } from '@/services/receiptTemplate';

import { addMember, addSubscription, migratedDb, seedBasics } from './helpers/fixtures';

const cash = { mode: 'cash' as const, reference: null, paidOn: '2026-10-15', note: null };

describe('date presets (§10.5 Collections)', () => {
  const today = '2026-10-15'; // a Thursday
  it('builds inclusive ranges', () => {
    expect(rangeFor('today', today, 'monday')).toEqual({ from: today, to: today });
    expect(rangeFor('yesterday', today, 'monday')).toEqual({ from: '2026-10-14', to: '2026-10-14' });
    expect(rangeFor('thisWeek', today, 'monday')).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    expect(rangeFor('thisWeek', today, 'sunday')).toEqual({ from: '2026-10-11', to: '2026-10-17' });
    expect(rangeFor('thisMonth', today, 'monday')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(rangeFor('lastMonth', '2026-03-31', 'monday')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(rangeFor('custom', today, 'monday', { from: '2026-10-20', to: '2026-10-01' })).toEqual({ from: '2026-10-01', to: '2026-10-20' });
  });

  it('totals by mode and dues list', () => {
    const t = totalsByMode([
      { mode: 'cash', amountPaise: 100 },
      { mode: 'upi', amountPaise: 500 },
      { mode: 'cash', amountPaise: 200 },
    ]);
    expect(t).toEqual({ byMode: [{ mode: 'upi', amountPaise: 500, count: 1 }, { mode: 'cash', amountPaise: 300, count: 2 }], totalPaise: 800, count: 3 });

    const m = (id: string, duePaise: number) => ({ id, fullName: id, memberCode: id, phone: '', photoUri: null, duePaise });
    const subs = [
      { id: 's1', memberId: 'a', startDate: '2026-09-01', totalPaise: 1000, status: 'active' as const },
      { id: 's2', memberId: 'a', startDate: '2026-10-01', totalPaise: 1000, status: 'active' as const },
      { id: 's3', memberId: 'b', startDate: '2026-08-01', totalPaise: 5000, status: 'active' as const },
    ];
    const paid = new Map([['s1', 1000]]);
    const amount = buildDuesList([m('a', 1000), m('b', 5000), m('c', 0)], subs, paid, 'amount');
    expect(amount.members.map((x) => [x.id, x.oldestSince])).toEqual([['b', '2026-08-01'], ['a', '2026-10-01']]);
    expect(amount.totalPaise).toBe(6000);
    expect(buildDuesList([m('a', 1000), m('b', 500)], subs, new Map(), 'oldest').members.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('record payment, refund and delete (§10.5, §6.5)', () => {
  async function setup() {
    const db = await migratedDb();
    const { plan, owner } = await seedBasics(db);
    const member = await addMember(db);
    const sub = await addSubscription(db, member.id, plan.id, { totalPaise: 300000 });
    return { db, member, sub, owner };
  }

  it('partial payments plus a refund give the correct dues (Done when)', async () => {
    const { db, member, sub, owner } = await setup();
    const pay = async (amount: number) => {
      const due = memberDues([sub], await db.getAllAsync('SELECT id, subscription_id AS subscriptionId, amount_paise AS amountPaise, is_refund AS isRefund, deleted_at AS deletedAt, paid_on AS paidOn, created_at AS createdAt FROM payments', []));
      const split = allocatePayment(amount, due.subscriptions);
      if (!split.ok) throw new Error(split.error);
      return recordPayment(db, { member, allocations: split.allocations, subscriptions: [sub], details: cash, receivedBy: owner.id, currency: 'INR' });
    };
    await pay(100000);
    await pay(50000);
    await recordRefund(db, { member, subscription: sub, amountPaise: 20000, details: cash, receivedBy: owner.id, currency: 'INR' });
    const payments = (await listMemberPaymentRows(db, member.id)).map((p) => ({ ...p }));
    expect(payments.map((p) => p.receiptNumber).sort()).toEqual(['RCPT00001', 'RCPT00002', 'RCPT00003']);
    expect(memberDues([sub], payments).totalDuePaise).toBe(300000 - 100000 - 50000 + 20000);
    expect(allocatePayment(999999, memberDues([sub], payments).subscriptions)).toMatchObject({ ok: false, error: 'overpayment' });
  });

  it('lists by range and kind, deletes to Trash, restores, purges; receipt numbers never reused', async () => {
    const { db, member, sub, owner } = await setup();
    const [p1] = await recordPayment(db, { member, allocations: [{ subscriptionId: sub.id, amountPaise: 1000 }], subscriptions: [sub], details: cash, receivedBy: owner.id, currency: 'INR' });
    await recordRefund(db, { member, subscription: null, amountPaise: 300, details: { ...cash, paidOn: '2026-10-16' }, receivedBy: null, currency: 'INR' });
    const range = { from: '2026-10-15', to: '2026-10-15' };
    const listed = await listPaymentsInRange(db, range, 'payments');
    expect(listed).toMatchObject([{ memberName: 'Rahul Sharma', planName: 'Monthly', staffName: 'Owner', amountPaise: 1000 }]);
    expect(await listPaymentsInRange(db, range, 'refunds')).toEqual([]);
    expect((await listPaymentsInRange(db, { from: '2026-10-01', to: '2026-10-31' }, 'refunds')).length).toBe(1);

    await softDeletePayment(db, p1, member.fullName, 'INR');
    expect(await listPaymentsInRange(db, range, 'payments')).toEqual([]);
    expect((await listTrashedPayments(db)).map((p) => p.id)).toEqual([p1.id]);
    await restorePayment(db, p1, member.fullName);
    expect((await listTrashedPayments(db)).length).toBe(0);
    await softDeletePayment(db, p1, member.fullName, 'INR');
    expect((await listPurgeablePayments(db, '2999-01-01T00:00:00Z')).length).toBe(1);
    await deletePaymentPermanently(db, p1, member.fullName, 'manual');
    expect(await paymentsRepo.getById(db, p1.id, { includeDeleted: true })).toBeNull();

    const [p3] = await recordPayment(db, { member, allocations: [{ subscriptionId: null, amountPaise: 500 }], subscriptions: [], details: cash, receivedBy: null, currency: 'INR' });
    expect(p3.receiptNumber).toBe('RCPT00003');
  });
});

describe('receipt (§10.5)', () => {
  const labels = new Proxy({} as ReceiptLabels, { get: (_t, k) => `[${String(k)}]` });
  const fmt = { money: (p: number) => `₹${p / 100}`, date: (d: string) => d.split('-').reverse().join('/'), mode: (m: string) => m.toUpperCase() };

  it('shows the plan breakdown, CGST/SGST with a GSTIN, and the balance after each payment', async () => {
    const db = await migratedDb();
    const { plan, owner } = await seedBasics(db);
    const member = await addMember(db, { fullName: 'A <b>&</b> B' });
    const sub = await addSubscription(db, member.id, plan.id, { basePricePaise: 200000, admissionFeePaise: 50000, discountPaise: 10000, discountReason: 'Diwali', taxPaise: 36611, totalPaise: 240000 });
    const [p1] = await recordPayment(db, { member, allocations: [{ subscriptionId: sub.id, amountPaise: 100000 }], subscriptions: [sub], details: { ...cash, mode: 'upi', reference: 'UPI42' }, receivedBy: owner.id, currency: 'INR' });
    await recordPayment(db, { member, allocations: [{ subscriptionId: sub.id, amountPaise: 40000 }], subscriptions: [sub], details: cash, receivedBy: owner.id, currency: 'INR' });

    const data = (await loadReceiptData(db, [p1.id]))!;
    const model = buildReceipt({ ...data, gym: { name: 'Iron Gym', address: 'MG Road', phone: '98', email: '', gstin: '27ABCDE1234F1Z5', logoDataUri: null }, taxPercent: 18, terms: 'No refunds' });
    expect(model).toMatchObject({ staffName: 'Owner', mode: 'upi', reference: 'UPI42', showGstSplit: true, netAmountPaise: 100000 });
    expect(model.items[0]).toMatchObject({ receiptNumber: 'RCPT00001', planName: 'Monthly', cgstPaise: 18305, sgstPaise: 18306, amountPaise: 100000, balanceDuePaise: 140000 });

    const html = renderReceiptHtml(model, labels, fmt, 'A5');
    expect(html).toContain('size: A5');
    expect(html).toContain('A &lt;b&gt;&amp;&lt;/b&gt; B');
    expect(html).toContain('[cgst] 9%');
    expect(html).toContain('[discount] (Diwali)');
    expect(html).toContain('₹1400');
    expect(html).toContain('No refunds');
    expect(html).not.toContain('<b>&</b>');
  });

  it('escapes HTML', () => {
    expect(escapeHtml(`<script>"x"&'y'</script>`)).toBe('&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;');
  });
});
