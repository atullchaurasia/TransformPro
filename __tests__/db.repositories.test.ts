import { auditLogRepo, branchesRepo, getAllSettings, getSetting, membersRepo, setSetting, writeAudit } from '@/db/repositories';
import { camelToSnake, snakeToCamel } from '@/db/repositories/base';
import { createWriter } from '@/db/writer';
import { useSessionStore } from '@/store/sessionStore';

import { addMember, migratedDb, seedBasics } from './helpers/fixtures';

describe('repository base', () => {
  it('converts camelCase ↔ snake_case', () => {
    expect(camelToSnake('renewedFromSubscriptionId')).toBe('renewed_from_subscription_id');
    expect(camelToSnake('bicepsLeftCm')).toBe('biceps_left_cm');
    expect(snakeToCamel('next_follow_up_on')).toBe('nextFollowUpOn');
  });

  it('creates rows with UUID ids and timestamps, and maps booleans', async () => {
    const db = await migratedDb();
    const b = await branchesRepo.create(db, { name: 'Main', address: null, phone: null, isActive: true });
    expect(b.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(b.isActive).toBe(true);
    expect(b.createdAt).toBe(b.updatedAt);
    const off = await branchesRepo.update(db, b.id, { isActive: false });
    expect(off.isActive).toBe(false);
  });

  it('round-trips a member through create / get / update', async () => {
    const db = await migratedDb();
    await seedBasics(db);
    const m = await addMember(db);
    expect((await membersRepo.getById(db, m.id))?.fullName).toBe('Rahul Sharma');
    const u = await membersRepo.update(db, m.id, { city: 'Pune', heightCm: 175.5 });
    expect(u.city).toBe('Pune');
    expect(u.heightCm).toBe(175.5);
    expect(u.dateOfBirth).toBe('1995-04-12');
  });

  it('soft delete hides from normal reads; restore brings it back', async () => {
    const db = await migratedDb();
    await seedBasics(db);
    const m = await addMember(db);
    await membersRepo.softDelete(db, m.id);
    expect(await membersRepo.getById(db, m.id)).toBeNull();
    expect(await membersRepo.count(db)).toBe(0);
    expect((await membersRepo.getById(db, m.id, { includeDeleted: true }))?.deletedAt).not.toBeNull();
    await membersRepo.restore(db, m.id);
    expect(await membersRepo.count(db)).toBe(1);
  });

  it('rejects unknown columns instead of building SQL from them', async () => {
    const db = await migratedDb();
    const b = await branchesRepo.create(db, { name: 'Main', address: null, phone: null, isActive: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- simulating a stray form field
    await expect(branchesRepo.update(db, b.id, { 'name = 1; DROP TABLE members; --': 'x' } as any)).rejects.toThrow(/no column/);
    await expect(branchesRepo.list(db, { orderBy: 'nope' as 'name' })).rejects.toThrow(/no column/);
  });

  it('lists with ordering', async () => {
    const db = await migratedDb();
    await branchesRepo.create(db, { name: 'B', address: null, phone: null, isActive: true });
    await branchesRepo.create(db, { name: 'A', address: null, phone: null, isActive: true });
    expect((await branchesRepo.list(db, { orderBy: 'name' })).map((b) => b.name)).toEqual(['A', 'B']);
  });
});

describe('settings', () => {
  it('stores JSON values and upserts', async () => {
    const db = await migratedDb();
    await setSetting(db, 'gym_name', 'Iron Temple');
    await setSetting(db, 'expiring_soon_days', 7);
    await setSetting(db, 'tax_enabled', false);
    await setSetting(db, 'gym_name', 'Iron Temple Gym');
    expect(await getSetting<string>(db, 'gym_name')).toBe('Iron Temple Gym');
    expect(await getAllSettings(db)).toEqual({ gym_name: 'Iron Temple Gym', expiring_soon_days: 7, tax_enabled: false });
    expect(await getSetting(db, 'missing')).toBeUndefined();
  });
});

describe('writer + audit', () => {
  it('commits a unit of work together with its audit entry, using the session staff', async () => {
    const db = await migratedDb();
    const { owner } = await seedBasics(db);
    useSessionStore.getState().setCurrentStaff(owner.id);
    const onCommitted = jest.fn();
    const write = createWriter(db, onCommitted);

    await write(async (tx) => {
      const m = await addMember(tx);
      await writeAudit(tx, { action: 'member.create', entity: 'member', entityId: m.id, summary: 'Added Rahul Sharma' });
    });

    const [entry] = await auditLogRepo.list(db);
    expect(entry).toMatchObject({ action: 'member.create', staffId: owner.id });
    expect(onCommitted).toHaveBeenCalledTimes(1);
    useSessionStore.getState().setCurrentStaff(null);
  });

  it('rolls back everything (including the audit entry) when any step fails', async () => {
    const db = await migratedDb();
    await seedBasics(db);
    const onCommitted = jest.fn();
    const write = createWriter(db, onCommitted);

    await expect(
      write(async (tx) => {
        await addMember(tx);
        await writeAudit(tx, { action: 'member.create', entity: 'member', summary: 'x' });
        await addMember(tx); // duplicate member code → fails
      }),
    ).rejects.toThrow(/UNIQUE/);

    expect(await membersRepo.count(db)).toBe(0);
    expect(await auditLogRepo.count(db)).toBe(0);
    expect(onCommitted).not.toHaveBeenCalled();
  });

  it('runs writes one at a time, in order, and keeps going after a failure', async () => {
    const db = await migratedDb();
    const write = createWriter(db);
    const order: string[] = [];
    const slow = write(async (tx) => {
      order.push('a:start');
      await new Promise((r) => setTimeout(r, 20));
      await branchesRepo.create(tx, { name: 'A', address: null, phone: null, isActive: true });
      order.push('a:end');
    });
    const failing = write(async () => {
      order.push('b');
      throw new Error('boom');
    });
    const fast = write(async (tx) => {
      order.push('c');
      return branchesRepo.create(tx, { name: 'C', address: null, phone: null, isActive: true });
    });

    await slow;
    await expect(failing).rejects.toThrow('boom');
    const c = await fast;
    expect(order).toEqual(['a:start', 'a:end', 'b', 'c']);
    expect(c.name).toBe('C');
    expect(await branchesRepo.count(db)).toBe(2);
  });
});
