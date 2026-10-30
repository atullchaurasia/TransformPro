import { plansRepo } from '@/db/repositories';
import { listActivePlans, listPlansWithCounts, nextPlanSortOrder, setPlanSortOrders } from '@/db/repositories/plans';
import { computeEndDate } from '@/domain/dates';
import { isOneTime, planDuration, planSessions, reorderPlans, sortPlans } from '@/domain/plans';
import { planFormSchema, toPlanInput, type PlanFormValues } from '@/features/plans/planSchema';

import { addMember, addSubscription, migratedDb, seedBasics } from './helpers/fixtures';

const m = { required: 'req', number: 'num', amount: 'amt', sessions: 'ses' };
const base: PlanFormValues = {
  name: 'Monthly',
  category: 'membership',
  oneTime: false,
  durationValue: '1',
  durationUnit: 'months',
  sessionCount: '',
  pricePaise: 150000,
  admissionFeePaise: null,
  maxFreezeDays: '0',
  maxFreezeTimes: '0',
  color: '#ff6b2c',
  description: '  ',
};

describe('plan domain (§10.3)', () => {
  it('maps plan columns to durations, incl. session plans and one-time services', () => {
    expect(planDuration({ category: 'membership', durationValue: 3, durationUnit: 'months', sessionCount: null })).toEqual({ unit: 'months', value: 3 });
    const pt = { category: 'personal_training' as const, durationValue: 60, durationUnit: 'sessions' as const, sessionCount: 12 };
    expect(planDuration(pt)).toEqual({ unit: 'sessions', value: 12, validityDays: 60 });
    expect(computeEndDate('2026-01-01', planDuration(pt))).toBe('2026-03-01');
    expect(planSessions(pt)).toBe(12);
    const steam = { category: 'service' as const, durationValue: 1, durationUnit: 'days' as const, sessionCount: null };
    expect(isOneTime(steam)).toBe(true);
    expect(isOneTime({ ...steam, category: 'membership' })).toBe(false);
    expect(computeEndDate('2026-01-01', planDuration(steam))).toBe('2026-01-01');
  });

  it('reorders by swapping neighbours and renumbering', () => {
    const plans = [
      { id: 'a', sortOrder: 0, name: 'A' },
      { id: 'b', sortOrder: 0, name: 'B' }, // tie from old data
      { id: 'c', sortOrder: 5, name: 'C' },
    ];
    expect(sortPlans(plans).map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect([...reorderPlans(plans, 'c', 'up')]).toEqual([['a', 0], ['c', 1], ['b', 2]]);
    expect([...reorderPlans(plans, 'a', 'up')]).toEqual([['a', 0], ['b', 1], ['c', 2]]);
  });
});

describe('plan form schema', () => {
  const schema = planFormSchema(m);

  it('accepts a normal plan and cleans it up', () => {
    expect(schema.safeParse(base).success).toBe(true);
    expect(toPlanInput(base)).toMatchObject({ pricePaise: 150000, admissionFeePaise: 0, color: '#FF6B2C', description: null, sessionCount: null });
  });

  it('requires name and a positive duration', () => {
    expect(schema.safeParse({ ...base, name: ' ' }).success).toBe(false);
    expect(schema.safeParse({ ...base, durationValue: '0' }).success).toBe(false);
    expect(schema.safeParse({ ...base, maxFreezeDays: '-1' }).success).toBe(false);
  });

  it('session plans need a session count; validity defaults to 90', () => {
    const pt = { ...base, category: 'personal_training' as const, durationUnit: 'sessions' as const, durationValue: '' };
    expect(schema.safeParse(pt).success).toBe(false);
    const ok = { ...pt, sessionCount: '12' };
    expect(schema.safeParse(ok).success).toBe(true);
    expect(toPlanInput(ok)).toMatchObject({ durationUnit: 'sessions', durationValue: 90, sessionCount: 12 });
  });

  it('one-time services store 1 day and skip duration validation', () => {
    const svc = { ...base, category: 'service' as const, oneTime: true, durationValue: '' };
    expect(schema.safeParse(svc).success).toBe(true);
    expect(toPlanInput(svc)).toMatchObject({ durationUnit: 'days', durationValue: 1, sessionCount: null });
  });
});

describe('plans repository', () => {
  it('counts active members per plan and hides inactive/deleted plans from pickers', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const quarterly = await plansRepo.create(db, { ...plan, id: undefined, name: 'Quarterly', durationValue: 3, sortOrder: 1 } as never);

    const rahul = await addMember(db);
    const priya = await addMember(db, { memberCode: 'TP0002', fullName: 'Priya', phone: '919800000002' });
    const old = await addMember(db, { memberCode: 'TP0003', fullName: 'Old', phone: '919800000003' });
    await addSubscription(db, rahul.id, plan.id);
    await addSubscription(db, priya.id, plan.id, { status: 'frozen', endDate: '2026-10-10' });
    await addSubscription(db, old.id, plan.id, { startDate: '2026-08-01', endDate: '2026-08-31' }); // expired
    await addSubscription(db, old.id, quarterly.id, { status: 'cancelled' });

    const list = await listPlansWithCounts(db, 'membership', '2026-10-15');
    expect(list.map((p) => [p.name, p.activeMembers])).toEqual([
      ['Monthly', 2],
      ['Quarterly', 0],
    ]);

    await plansRepo.update(db, quarterly.id, { isActive: false });
    expect((await listActivePlans(db, 'membership')).map((p) => p.name)).toEqual(['Monthly']);
    expect((await listPlansWithCounts(db, 'membership', '2026-10-15')).length).toBe(2); // still listed on the Plans screen

    await plansRepo.softDelete(db, quarterly.id);
    expect((await listPlansWithCounts(db, 'membership', '2026-10-15')).length).toBe(1);

    expect(await nextPlanSortOrder(db, 'membership')).toBe(1);
    expect(await nextPlanSortOrder(db, 'service')).toBe(0);
  });

  it('editing a plan price leaves existing subscriptions untouched', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const member = await addMember(db);
    const sub = await addSubscription(db, member.id, plan.id);
    await plansRepo.update(db, plan.id, { pricePaise: 999900, name: 'Monthly (new)' });
    const row = await db.getFirstAsync<{ base_price_paise: number; plan_name_snapshot: string }>('SELECT * FROM subscriptions WHERE id = ?', [sub.id]);
    expect(row).toMatchObject({ base_price_paise: 150000, plan_name_snapshot: 'Monthly' });
  });

  it('saves a new order', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    await setPlanSortOrders(db, new Map([[plan.id, 7]]));
    expect((await plansRepo.getById(db, plan.id))?.sortOrder).toBe(7);
  });
});
