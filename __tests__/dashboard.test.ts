import { backupReminder, dailySeries, isSameDayOfYear, memberBuckets, monthSummary, peakHours, percentChange } from '@/domain/dashboard';
import type { MemberSummary } from '@/domain/memberList';
import { loadDashboard } from '@/features/dashboard/dashboardData';

import { addMember, addSubscription, migratedDb, seedBasics } from './helpers/fixtures';

const today = '2026-10-15';
const settings = { expiring_soon_days: 7, grace_period_days: 0, last_backup_at: null, backup_reminder_days: 7 };

function summary(id: string, extra: Partial<MemberSummary> = {}): MemberSummary {
  return {
    id,
    memberCode: id,
    fullName: id,
    phone: '919800000000',
    photoUri: null,
    gender: null,
    dateOfBirth: null,
    anniversaryDate: null,
    joiningDate: '2026-01-01',
    createdAt: '2026-01-01T00:00:00Z',
    branchId: null,
    assignedTrainerId: null,
    status: 'active',
    daysLeft: 20,
    daysSinceExpiry: null,
    planName: 'Monthly',
    planId: 'p',
    expiryDate: '2026-11-04',
    duePaise: 0,
    hasActivePT: false,
    trainerId: null,
    lastVisit: today,
    ...extra,
  };
}

describe('dashboard domain (§10.1)', () => {
  it('buckets each member exactly as the cards count them', () => {
    const members = [
      summary('new', { joiningDate: today }),
      summary('today', { status: 'expiring', daysLeft: 0 }),
      summary('soon', { status: 'expiring', daysLeft: 3 }),
      summary('lapsed', { status: 'expired', daysLeft: null, daysSinceExpiry: 10, lastVisit: '2026-10-01' }),
      summary('old', { status: 'expired', daysLeft: null, daysSinceExpiry: 45 }),
      summary('owes', { duePaise: 5000, dateOfBirth: '1990-10-15', anniversaryDate: '2015-10-15' }),
      summary('away', { lastVisit: '2026-10-01' }),
      summary('ice', { status: 'frozen' }),
      summary('none', { status: 'noPlan', daysLeft: null }),
    ];
    const b = memberBuckets(members, {
      renewedToday: new Set(['soon']),
      lastVisitByMember: new Map(members.filter((m) => m.lastVisit).map((m) => [m.id, m.lastVisit as string])),
      freezeEnds: new Map([['ice', '2026-10-18']]),
      today,
      expiringSoonDays: 7,
    });
    const ids = (k: keyof typeof b) => b[k].map((m) => m.id);
    expect(ids('admissionsToday')).toEqual(['new']);
    expect(ids('renewalsToday')).toEqual(['soon']);
    expect(ids('expiringToday')).toEqual(['today']);
    expect(ids('expiringSoon')).toEqual(['soon']);
    expect(ids('winBack')).toEqual(['lapsed']);
    expect(ids('dues')).toEqual(['owes']);
    expect(ids('birthdays')).toEqual(['owes']);
    expect(ids('anniversaries')).toEqual(['owes']);
    expect(ids('absent')).toEqual(['away']);
    expect(ids('frozenEnding')).toEqual(['ice']);
    expect(b.statusActive.length).toBe(5); // active + expiring
    expect(ids('statusExpired')).toEqual(['lapsed', 'old']);
    expect(b.all.length).toBe(members.length);
  });

  it('helpers', () => {
    expect(isSameDayOfYear('2000-02-29', '2027-02-28')).toBe(true);
    expect(isSameDayOfYear('2000-02-29', '2028-02-28')).toBe(false);
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(10, 0)).toBeNull();
    expect(dailySeries([{ day: '2026-10-14', value: 5 }], '2026-10-13', '2026-10-15').map((d) => d.value)).toEqual([0, 5, 0]);
    expect(peakHours([{ hour: 6, count: 4 }, { hour: 18, count: 9 }])[18]).toBe(9);
    expect(backupReminder(null, 7, new Date())).toEqual({ due: true, daysAgo: null });
    expect(backupReminder('2026-10-10T10:00:00.000Z', 7, new Date('2026-10-15T10:00:00.000Z'))).toEqual({ due: false, daysAgo: 5 });
    expect(monthSummary({ collectedPaise: 1000, refundedPaise: 100, lastMonthCollectedPaise: 500, expensesPaise: 200, admissions: 1, renewals: 1, endedThisMonth: 4, renewedOfEnded: 3 })).toMatchObject({
      changePercent: 100,
      netProfitPaise: 700,
      renewalRatePercent: 75,
    });
  });
});

describe('loadDashboard', () => {
  it('aggregates match the underlying rows', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const now = new Date(2026, 9, 15, 12, 0, 0);
    const m = await addMember(db, { joiningDate: '2026-10-15' });
    const old = await addSubscription(db, m.id, plan.id, { startDate: '2026-09-01', endDate: '2026-10-05' });
    await addSubscription(db, m.id, plan.id, { startDate: '2026-10-06', endDate: '2026-11-05', renewedFromSubscriptionId: old.id });
    const pay = (n: number, mode: string, paidOn: string, refund = 0) =>
      db.runAsync("INSERT INTO payments (id, receipt_number, member_id, amount_paise, mode, paid_on, is_refund, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, '', '')", [`p${n}`, `R${n}`, m.id, n * 100, mode, paidOn, refund]);
    await pay(10, 'cash', '2026-10-15');
    await pay(20, 'upi', '2026-10-15');
    await pay(5, 'cash', '2026-10-02', 1);
    await pay(40, 'cash', '2026-09-20');
    await db.runAsync("INSERT INTO attendance (id, member_id, date, check_in_at, method, created_at, updated_at) VALUES ('a1', ?, '2026-10-15', ?, 'qr', '', '')", [m.id, now.toISOString()]);

    const d = await loadDashboard(db, settings, now);
    expect(d.agg).toMatchObject({ checkinsToday: 1, insideNow: 1, followUpsDue: 0 });
    expect(d.collectedTodayPaise).toBe(3000);
    expect(d.agg.collectedTodayByMode).toEqual([{ mode: 'upi', amountPaise: 2000 }, { mode: 'cash', amountPaise: 1000 }]);
    expect(d.month).toMatchObject({ collectedPaise: 3000, refundedPaise: 500, lastMonthCollectedPaise: 4000, admissions: 1, endedThisMonth: 1, renewedOfEnded: 1, renewalRatePercent: 100 });
    expect(d.collections.at(-1)).toEqual({ day: '2026-10-15', value: 3000 });
    expect(d.peakHours[12]).toBe(1);
    expect(d.buckets.admissionsToday.map((x) => x.id)).toEqual([m.id]);
  });

  it('stays fast with 5,000 members, 20,000 payments and 100,000 check-ins', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    await db.execAsync(`
      WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5000)
      INSERT INTO members (id, member_code, full_name, phone, joining_date, date_of_birth, created_at, updated_at)
      SELECT 'm' || i, 'G' || i, 'Member ' || i, '9190' || printf('%08d', i), date('2025-01-01', '+' || (i % 600) || ' days'), date('1990-01-01', '+' || (i % 365) || ' days'), '', '' FROM n;
      WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5000)
      INSERT INTO subscriptions (id, member_id, plan_id, plan_name_snapshot, category_snapshot, start_date, end_date, total_paise, created_at, updated_at)
      SELECT 's' || i, 'm' || i, '${plan.id}', 'Monthly', 'membership', date('2026-09-01', '+' || (i % 60) || ' days'), date('2026-09-30', '+' || (i % 60) || ' days'), 150000, '', '' FROM n;
      WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 20000)
      INSERT INTO payments (id, receipt_number, member_id, subscription_id, amount_paise, mode, paid_on, created_at, updated_at)
      SELECT 'p' || i, 'R' || i, 'm' || ((i % 5000) + 1), 's' || ((i % 5000) + 1), 10000, 'cash', date('2026-01-01', '+' || (i % 300) || ' days'), '', '' FROM n;
      WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 100000)
      INSERT INTO attendance (id, member_id, date, check_in_at, method, created_at, updated_at)
      SELECT 'a' || i, 'm' || ((i % 5000) + 1), date('2026-01-01', '+' || (i % 300) || ' days'), date('2026-01-01', '+' || (i % 300) || ' days') || 'T0' || (i % 10) || ':00:00.000Z', 'qr', '', '' FROM n;
    `);
    const started = Date.now();
    const d = await loadDashboard(db, settings, new Date(2026, 9, 15, 12));
    const ms = Date.now() - started;
    expect(d.buckets.all.length).toBe(5000);
    // Device target is 500 ms (§10.1); this guard is looser so a slow CI box doesn't flake.
    expect(ms).toBeLessThan(1500);
  });
});
