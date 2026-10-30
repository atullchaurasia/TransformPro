import { paymentsRepo, staffRepo, subscriptionsRepo } from '@/db/repositories';

import { addMember, addSubscription, migratedDb, seedBasics } from './helpers/fixtures';

// Database-level integrity rules (spec §5.2, CLAUDE.md §4, §13).
describe('schema constraints', () => {
  it('enforces foreign keys', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    await expect(addSubscription(db, 'no-such-member', plan.id)).rejects.toThrow(/FOREIGN KEY/);
  });

  it('rejects dates that are not YYYY-MM-DD', async () => {
    const db = await migratedDb();
    await seedBasics(db);
    await expect(addMember(db, { joiningDate: '01/10/2026' })).rejects.toThrow(/CHECK/);
  });

  it('rejects an end date before the start date', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const m = await addMember(db);
    await expect(addSubscription(db, m.id, plan.id, { startDate: '2026-10-10', endDate: '2026-10-09' })).rejects.toThrow(/CHECK/);
  });

  it('rejects negative money and zero payments', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const m = await addMember(db);
    await expect(addSubscription(db, m.id, plan.id, { totalPaise: -1 })).rejects.toThrow(/CHECK/);
    await expect(
      paymentsRepo.create(db, {
        receiptNumber: 'RCPT00001',
        memberId: m.id,
        subscriptionId: null,
        branchId: null,
        amountPaise: 0,
        mode: 'cash',
        reference: null,
        paidOn: '2026-10-01',
        note: null,
        receivedBy: null,
        isRefund: false,
      }),
    ).rejects.toThrow(/CHECK/);
  });

  it('rejects unknown enum values', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const m = await addMember(db);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately invalid value
    await expect(addSubscription(db, m.id, plan.id, { status: 'paused' as any })).rejects.toThrow(/CHECK/);
  });

  it('allows exactly one owner', async () => {
    const db = await migratedDb();
    const { owner } = await seedBasics(db);
    await expect(staffRepo.create(db, { ...owner, id: undefined, name: 'Second owner' })).rejects.toThrow(/UNIQUE/);
  });

  it('keeps member codes unique, case-insensitively', async () => {
    const db = await migratedDb();
    await seedBasics(db);
    await addMember(db, { memberCode: 'TP0001' });
    await expect(addMember(db, { memberCode: 'tp0001', phone: '919800000000' })).rejects.toThrow(/UNIQUE/);
  });

  it('a subscription with payments cannot be deleted on its own', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const m = await addMember(db);
    const s = await addSubscription(db, m.id, plan.id);
    await paymentsRepo.create(db, {
      receiptNumber: 'RCPT00001',
      memberId: m.id,
      subscriptionId: s.id,
      branchId: null,
      amountPaise: 50000,
      mode: 'upi',
      reference: null,
      paidOn: '2026-10-01',
      note: null,
      receivedBy: null,
      isRefund: false,
    });
    await expect(subscriptionsRepo.hardDelete(db, s.id)).rejects.toThrow(/FOREIGN KEY/);
  });

  it('permanently deleting a member removes all their data (Trash → delete permanently)', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const m = await addMember(db);
    const s = await addSubscription(db, m.id, plan.id);
    await paymentsRepo.create(db, {
      receiptNumber: 'RCPT00001',
      memberId: m.id,
      subscriptionId: s.id,
      branchId: null,
      amountPaise: 50000,
      mode: 'cash',
      reference: null,
      paidOn: '2026-10-01',
      note: null,
      receivedBy: null,
      isRefund: false,
    });
    await db.runAsync('DELETE FROM members WHERE id = ?', [m.id]);
    expect(await subscriptionsRepo.count(db)).toBe(0);
    expect(await paymentsRepo.count(db, { includeDeleted: true })).toBe(0);
  });
});
