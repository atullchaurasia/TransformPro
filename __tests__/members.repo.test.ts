import { allocateMemberCode, allocateReceiptNumber, peekNextMemberCode } from '@/db/repositories/codes';
import { createMemberWithPlans, DuplicateCodeError, updateMember, type NewMemberInput } from '@/db/repositories/memberCreate';
import {
  deleteMemberPermanently,
  findMembersByPhone,
  listPurgeableMembers,
  listTrashedMembers,
  loadMemberListData,
  searchMembers,
} from '@/db/repositories/members';
import { membersRepo } from '@/db/repositories';
import { saveSettings } from '@/db/repositories/settings';
import { buildMemberSummaries } from '@/domain/memberList';
import { draftSubscription, newLine, planNewMemberPayment } from '@/domain/newMember';

import { addMember, migratedDb, seedBasics } from './helpers/fixtures';

const noTax = { enabled: false, percent: 18, inclusive: true };

function memberInput(overrides: Partial<NewMemberInput['member']> = {}): NewMemberInput['member'] {
  return {
    memberCode: null,
    branchId: null,
    fullName: 'Rahul Sharma',
    phone: '919876543210',
    altPhone: null,
    email: null,
    gender: 'male',
    dateOfBirth: null,
    anniversaryDate: null,
    address: null,
    area: null,
    city: null,
    pincode: null,
    occupation: null,
    photoUri: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    emergencyContactRelation: null,
    bloodGroup: null,
    medicalConditions: null,
    fitnessGoal: null,
    idProofType: null,
    idProofNumber: null,
    heightCm: null,
    joiningDate: '2026-10-01',
    referredByMemberId: null,
    source: null,
    assignedTrainerId: null,
    notes: null,
    biometricId: null,
    createdBy: null,
    ...overrides,
  };
}

describe('codes (§6.7)', () => {
  it('allocates member codes and receipt numbers atomically, skipping used ones', async () => {
    const db = await migratedDb();
    expect(await peekNextMemberCode(db)).toBe('GYM0001');
    await addMember(db, { memberCode: 'GYM0001' }); // owner typed it by hand
    expect(await allocateMemberCode(db)).toBe('GYM0002');
    expect(await allocateMemberCode(db)).toBe('GYM0003');
    await saveSettings(db, { receipt_prefix: 'TP' });
    expect(await allocateReceiptNumber(db)).toBe('TP00001');
    expect(await allocateReceiptNumber(db)).toBe('TP00002');
  });
});

describe('createMemberWithPlans (§10.2)', () => {
  it('saves member + subscription + split payments + audit, and the list shows the right due', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const drafts = [draftSubscription(newLine(plan, '2026-10-01'), noTax), draftSubscription(newLine({ ...plan, id: plan.id, name: 'Locker', category: 'service', pricePaise: 50000 }, '2026-10-01'), noTax)];
    const pay = planNewMemberPayment(drafts, 160000, false);
    if (!pay.ok) throw new Error('plan');
    const result = await createMemberWithPlans(db, {
      member: memberInput(),
      subscriptions: drafts.map(({ price: _p, ...d }) => d),
      payment: { plan: pay.plan, mode: 'upi', reference: 'UPI123', paidOn: '2026-10-01', note: null },
      currency: 'INR',
    });

    expect(result.member.memberCode).toBe('GYM0001');
    expect(result.subscriptions.map((s) => s.totalPaise)).toEqual([150000, 50000]);
    expect(result.payments.map((p) => [p.receiptNumber, p.amountPaise])).toEqual([
      ['RCPT00001', 150000],
      ['RCPT00002', 10000],
    ]);
    const audits = await db.getAllAsync<{ action: string }>('SELECT action FROM audit_log ORDER BY created_at', []);
    expect(audits.map((a) => a.action).sort()).toEqual(['member.create', 'payment.create', 'payment.create', 'subscription.create', 'subscription.create']);

    const data = await loadMemberListData(db);
    const [summary] = buildMemberSummaries({ ...data, today: '2026-10-10', settings: { expiringSoonDays: 7, gracePeriodDays: 0 } });
    expect(summary).toMatchObject({ status: 'active', duePaise: 40000, planName: 'Monthly' });
  });

  it('rolls back everything when the code is taken', async () => {
    const db = await migratedDb();
    await addMember(db, { memberCode: 'VIP1' });
    await expect(createMemberWithPlans(db, { member: memberInput({ memberCode: 'vip1' }), subscriptions: [], payment: null, currency: 'INR' })).rejects.toThrow(DuplicateCodeError);
  });

  it('edit keeps codes unique', async () => {
    const db = await migratedDb();
    const a = await addMember(db, { memberCode: 'A1' });
    await addMember(db, { memberCode: 'B1', phone: '919800000001' });
    await expect(updateMember(db, a.id, { memberCode: 'b1' })).rejects.toThrow(DuplicateCodeError);
    expect((await updateMember(db, a.id, { memberCode: 'a2', city: 'Pune' })).memberCode).toBe('A2');
  });
});

describe('search, duplicates and trash', () => {
  it('searches name, code and phone (with or without country code); escapes LIKE wildcards', async () => {
    const db = await migratedDb();
    await addMember(db, { memberCode: 'GYM0007', fullName: 'Priya Patel', phone: '919812345678' });
    await addMember(db, { memberCode: 'GYM0008', fullName: '100% Fit', phone: '919800000008' });
    const names = async (q: string) => (await searchMembers(db, q)).map((m) => m.fullName);
    expect(await names('priya')).toEqual(['Priya Patel']);
    expect(await names('gym0007')).toEqual(['Priya Patel']);
    expect(await names('98123')).toEqual(['Priya Patel']);
    expect(await names('%')).toEqual(['100% Fit']);
    expect((await names('')).length).toBe(2);
  });

  it('finds duplicate phones, including members in Trash and alt phones', async () => {
    const db = await migratedDb();
    const a = await addMember(db, { phone: '919812345678' });
    const b = await addMember(db, { memberCode: 'X2', phone: '919800000002', altPhone: '919812345678' });
    await membersRepo.softDelete(db, b.id);
    expect((await findMembersByPhone(db, '919812345678')).map((m) => m.id).sort()).toEqual([a.id, b.id].sort());
    expect((await findMembersByPhone(db, '919812345678', a.id)).map((m) => m.id)).toEqual([b.id]);
  });

  it('trash lists, purges by age, and permanent delete cascades', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const m = await addMember(db);
    await createMemberWithPlans(db, { member: memberInput({ phone: '919800000009' }), subscriptions: [], payment: null, currency: 'INR' });
    const drafts = [draftSubscription(newLine(plan, '2026-10-01'), noTax)];
    const pay = planNewMemberPayment(drafts, 1000, false);
    if (!pay.ok) throw new Error('plan');
    const withPay = await createMemberWithPlans(db, {
      member: memberInput({ phone: '919800000010', memberCode: 'PAY1' }),
      subscriptions: drafts.map(({ price: _p, ...d }) => d),
      payment: { plan: pay.plan, mode: 'cash', reference: null, paidOn: '2026-10-01', note: null },
      currency: 'INR',
    });

    await membersRepo.softDelete(db, m.id);
    await membersRepo.softDelete(db, withPay.member.id);
    expect((await listTrashedMembers(db)).length).toBe(2);
    expect((await listPurgeableMembers(db, '2000-01-01T00:00:00Z')).length).toBe(0);
    expect((await listPurgeableMembers(db, '2999-01-01T00:00:00Z')).length).toBe(2);

    await deleteMemberPermanently(db, withPay.member.id);
    const left = await db.getFirstAsync<{ s: number; p: number }>(
      'SELECT (SELECT COUNT(*) FROM subscriptions WHERE member_id = ?) AS s, (SELECT COUNT(*) FROM payments WHERE member_id = ?) AS p',
      [withPay.member.id, withPay.member.id],
    );
    expect(left).toEqual({ s: 0, p: 0 });
    expect((await listTrashedMembers(db)).map((x) => x.id)).toEqual([m.id]);
  });
});
