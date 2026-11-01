import { subscriptionsRepo } from '@/db/repositories';
import { autoCheckout, checkIn, checkOut, deleteVisit, findMemberByCode, listRecentVisitors, listVisitsBetween, listVisitsOn } from '@/db/repositories/attendance';
import { absentees, attendanceStats, filterToday, monthGrid, shouldIgnoreScan, visitMinutes } from '@/domain/attendance';
import { evaluateCheckin } from '@/domain/checkin';
import { computeStatus } from '@/domain/membershipStatus';

import { addMember, addSubscription, migratedDb, seedBasics } from './helpers/fixtures';

const v = (date: string, inT: string, outT: string | null = null) => ({ date, checkInAt: `${date}T${inT}:00.000Z`, checkOutAt: outT ? `${date}T${outT}:00.000Z` : null });

describe('attendance maths', () => {
  it('stats: monthly counts, streak (today not required yet), average duration', () => {
    const s = attendanceStats([v('2026-10-14', '06:00', '07:30'), v('2026-10-13', '06:00', '07:00'), v('2026-10-12', '18:00'), v('2026-09-30', '06:00', '06:30')], '2026-10-15');
    expect(s.streak).toBe(3);
    expect(s.visitsByMonth.get('2026-10')).toBe(3);
    expect(s.averageMinutes).toBe(60);
    expect(attendanceStats([], '2026-10-15')).toMatchObject({ streak: 0, averageMinutes: null });
    expect(visitMinutes(v('2026-10-14', '06:00'))).toBeNull();
  });

  it('month grid starts on the week start and marks visits', () => {
    const grid = monthGrid('2026-10', 'monday', new Set(['2026-10-15']), '2026-10-15');
    expect(grid[0]?.[0]).toMatchObject({ date: '2026-09-28', inMonth: false });
    expect(grid.flat().find((d) => d.date === '2026-10-15')).toMatchObject({ visited: true, isToday: true });
    expect(grid.at(-1)?.at(-1)?.date).toBe('2026-11-01');
    expect(monthGrid('2026-10', 'sunday', new Set(), '2026-10-15')[0]?.[0]?.date).toBe('2026-09-27');
  });

  it('filters, absentees, scan debounce', () => {
    const rows = [{ checkOutAt: null }, { checkOutAt: 'x' }];
    expect(filterToday(rows, 'inside').length).toBe(1);
    expect(filterToday(rows, 'left').length).toBe(1);
    const members = [
      { id: 'a', joiningDate: '2026-01-01', status: 'active' },
      { id: 'b', joiningDate: '2026-10-10', status: 'active' },
      { id: 'c', joiningDate: '2026-01-01', status: 'expired' },
      { id: 'd', joiningDate: '2026-01-01', status: 'grace' },
    ];
    const list = absentees(members, new Map([['a', '2026-10-01'], ['d', '2026-10-14']]), '2026-10-15', 7);
    expect(list.map((m) => [m.id, m.daysAway])).toEqual([['a', 14]]);
    const seen = new Map([['GYM1', 1000]]);
    expect(shouldIgnoreScan(seen, 'GYM1', 5999)).toBe(true);
    expect(shouldIgnoreScan(seen, 'GYM1', 6000)).toBe(false);
    expect(shouldIgnoreScan(seen, 'GYM2', 2000)).toBe(false);
  });
});

describe('check-in rules + attendance repository (§6.8)', () => {
  it('an expired member is blocked; an override checks in and is logged (Done when)', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const member = await addMember(db, { memberCode: 'GYM0001' });
    const sub = await addSubscription(db, member.id, plan.id, { startDate: '2026-09-01', endDate: '2026-09-30' });
    const membership = computeStatus([sub], [], '2026-10-15', { expiringSoonDays: 7, gracePeriodDays: 0 });
    const settings = { blockExpired: true, blockDues: false, allowMultiplePerDay: false };
    const d = evaluateCheckin({ membership, duePaise: 0, todayVisits: [], settings, canOverride: true });
    expect(d).toMatchObject({ kind: 'blocked', reasons: ['expired'], overridable: true });

    expect((await findMemberByCode(db, 'gym0001'))?.id).toBe(member.id);
    const visit = await checkIn(db, { member, date: '2026-10-15', at: '2026-10-15T06:00:00.000Z', method: 'qr', subscriptionId: sub.id, consumeSessionOf: null, markedBy: null, override: { reason: 'Paying tomorrow', blockedFor: ['expired'] } });
    const audit = await db.getAllAsync<{ action: string; summary: string }>('SELECT action, summary FROM audit_log', []);
    expect(audit).toEqual([{ action: 'attendance.override', summary: expect.stringContaining('Paying tomorrow') }]);

    const today = await listVisitsOn(db, member.id, '2026-10-15');
    expect(evaluateCheckin({ membership, duePaise: 0, todayVisits: today, settings, canOverride: true })).toEqual({ kind: 'check_out', visitId: visit.id });
    await checkOut(db, visit, '2026-10-15T05:00:00.000Z'); // clock skew → clamped to the check-in time
    expect((await listVisitsOn(db, member.id, '2026-10-15'))[0]?.checkOutAt).toBe(visit.checkInAt);
  });

  it('session plans use a session; deleting the visit gives it back', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const member = await addMember(db);
    const pt = await addSubscription(db, member.id, plan.id, { sessionsTotal: 10, sessionsUsed: 2 });
    const visit = await checkIn(db, { member, date: '2026-10-15', at: '2026-10-15T06:00:00.000Z', method: 'search', subscriptionId: null, consumeSessionOf: pt.id, markedBy: null, override: null });
    expect((await subscriptionsRepo.getById(db, pt.id))?.sessionsUsed).toBe(3);
    const [row] = await listVisitsBetween(db, '2026-10-01', '2026-10-31');
    expect(row).toMatchObject({ memberName: 'Rahul Sharma', subscriptionId: pt.id });
    expect((await listRecentVisitors(db)).map((m) => m.id)).toEqual([member.id]);
    await deleteVisit(db, { ...visit }, member.fullName);
    expect((await subscriptionsRepo.getById(db, pt.id))?.sessionsUsed).toBe(2);
    expect(await listVisitsBetween(db, '2026-10-01', '2026-10-31')).toEqual([]);
  });

  it('auto check-out closes visits older than the limit at check-in + hours', async () => {
    const db = await migratedDb();
    const member = await addMember(db);
    const base = { member, date: '2026-10-15', method: 'manual' as const, subscriptionId: null, consumeSessionOf: null, markedBy: null, override: null };
    await checkIn(db, { ...base, at: '2026-10-15T05:00:00.000Z' });
    await checkIn(db, { ...base, at: '2026-10-15T09:30:00.000Z' });
    expect(await autoCheckout(db, new Date('2026-10-15T10:00:00.000Z'), 3)).toBe(1);
    const rows = await listVisitsBetween(db, '2026-10-15', '2026-10-15');
    expect(rows.map((r) => r.checkOutAt)).toEqual([null, '2026-10-15T08:00:00.000Z']);
  });
});
