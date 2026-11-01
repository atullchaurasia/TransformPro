// Dashboard aggregates (spec §10.1): every money / attendance number is one indexed SQL query.
// Member statuses come from the members-list pipeline (they need the §6.1 rules in JS).
import type { ISODate, PaymentMode } from '../models';
import type { Db } from '../types';

export type DashboardRanges = {
  today: ISODate;
  /** Local midnight today / tomorrow as ISO timestamps (created_at is stored in UTC). */
  todayStartIso: string;
  tomorrowStartIso: string;
  monthFrom: ISODate;
  monthTo: ISODate;
  monthStartIso: string;
  nextMonthStartIso: string;
  lastMonthFrom: ISODate;
  lastMonthTo: ISODate;
  /** First day of the 30-day chart window. */
  chartFrom: ISODate;
};

export type DashboardAggregates = {
  checkinsToday: number;
  insideNow: number;
  collectedTodayByMode: { mode: PaymentMode; amountPaise: number }[];
  expensesTodayPaise: number;
  renewedTodayMemberIds: string[];
  month: {
    collectedPaise: number;
    refundedPaise: number;
    lastMonthCollectedPaise: number;
    expensesPaise: number;
    admissions: number;
    renewals: number;
    endedThisMonth: number;
    renewedOfEnded: number;
  };
  dailyCollections: { day: ISODate; value: number }[];
  dailyAttendance: { day: ISODate; value: number }[];
  peakHours: { hour: number; count: number }[];
  followUpsDue: number;
};

// Same rules as the Payments tab, so the numbers match its lists: live payments of members not in Trash.
const LIVE_PAYMENTS = 'FROM payments p JOIN members m ON m.id = p.member_id AND m.deleted_at IS NULL WHERE p.deleted_at IS NULL';

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0)) || 0;

export async function loadDashboardAggregates(db: Db, r: DashboardRanges): Promise<DashboardAggregates> {
  const visits = await db.getFirstAsync<{ total: number; inside: number }>(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN a.check_out_at IS NULL THEN 1 ELSE 0 END) AS inside
     FROM attendance a JOIN members m ON m.id = a.member_id AND m.deleted_at IS NULL WHERE a.date = ?`,
    [r.today],
  );

  const byMode = await db.getAllAsync<{ mode: PaymentMode; amount: number }>(
    `SELECT p.mode AS mode, SUM(p.amount_paise) AS amount ${LIVE_PAYMENTS} AND p.is_refund = 0 AND p.paid_on = ? GROUP BY p.mode ORDER BY amount DESC`,
    [r.today],
  );

  const sumExpenses = async (from: ISODate, to: ISODate) =>
    num((await db.getFirstAsync<{ s: number }>('SELECT SUM(amount_paise) AS s FROM expenses WHERE deleted_at IS NULL AND spent_on BETWEEN ? AND ?', [from, to]))?.s);

  const sumPayments = async (from: ISODate, to: ISODate, refund: 0 | 1) =>
    num((await db.getFirstAsync<{ s: number }>(`SELECT SUM(p.amount_paise) AS s ${LIVE_PAYMENTS} AND p.is_refund = ? AND p.paid_on BETWEEN ? AND ?`, [refund, from, to]))?.s);

  // A renewal = a new plan that continues an earlier one (§6.3 `renewed_from_subscription_id`).
  const renewedToday = await db.getAllAsync<{ member_id: string }>(
    `SELECT DISTINCT s.member_id FROM subscriptions s JOIN members m ON m.id = s.member_id AND m.deleted_at IS NULL
     WHERE s.renewed_from_subscription_id IS NOT NULL AND s.status <> 'cancelled' AND s.created_at >= ? AND s.created_at < ?`,
    [r.todayStartIso, r.tomorrowStartIso],
  );
  const renewalsMonth = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM subscriptions s JOIN members m ON m.id = s.member_id AND m.deleted_at IS NULL
     WHERE s.renewed_from_subscription_id IS NOT NULL AND s.status <> 'cancelled' AND s.created_at >= ? AND s.created_at < ?`,
    [r.monthStartIso, r.nextMonthStartIso],
  );
  const admissions = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM members WHERE deleted_at IS NULL AND joining_date BETWEEN ? AND ?', [r.monthFrom, r.monthTo]);
  // Renewal rate: memberships that ended this month so far, and how many of them were renewed.
  const rate = await db.getFirstAsync<{ ended: number; renewed: number }>(
    `SELECT COUNT(*) AS ended,
            SUM(CASE WHEN EXISTS (SELECT 1 FROM subscriptions n WHERE n.renewed_from_subscription_id = s.id AND n.status <> 'cancelled') THEN 1 ELSE 0 END) AS renewed
     FROM subscriptions s JOIN members m ON m.id = s.member_id AND m.deleted_at IS NULL
     WHERE s.category_snapshot = 'membership' AND s.status <> 'cancelled' AND s.end_date BETWEEN ? AND ?`,
    [r.monthFrom, r.today],
  );

  const dailyCollections = await db.getAllAsync<{ day: ISODate; value: number }>(
    `SELECT p.paid_on AS day, SUM(p.amount_paise) AS value ${LIVE_PAYMENTS} AND p.is_refund = 0 AND p.paid_on BETWEEN ? AND ? GROUP BY p.paid_on`,
    [r.chartFrom, r.today],
  );
  const dailyAttendance = await db.getAllAsync<{ day: ISODate; value: number }>(
    'SELECT a.date AS day, COUNT(*) AS value FROM attendance a JOIN members m ON m.id = a.member_id AND m.deleted_at IS NULL WHERE a.date BETWEEN ? AND ? GROUP BY a.date',
    [r.chartFrom, r.today],
  );
  // Hour of day in the phone's local time zone.
  const peakHours = await db.getAllAsync<{ hour: string; count: number }>(
    "SELECT strftime('%H', a.check_in_at, 'localtime') AS hour, COUNT(*) AS count FROM attendance a JOIN members m ON m.id = a.member_id AND m.deleted_at IS NULL WHERE a.date BETWEEN ? AND ? GROUP BY hour",
    [r.chartFrom, r.today],
  );
  const followUps = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM enquiries WHERE deleted_at IS NULL AND status NOT IN ('converted', 'lost') AND next_follow_up_on IS NOT NULL AND next_follow_up_on <= ?",
    [r.today],
  );

  return {
    checkinsToday: num(visits?.total),
    insideNow: num(visits?.inside),
    collectedTodayByMode: byMode.map((b) => ({ mode: b.mode, amountPaise: num(b.amount) })),
    expensesTodayPaise: await sumExpenses(r.today, r.today),
    renewedTodayMemberIds: renewedToday.map((x) => x.member_id),
    month: {
      collectedPaise: await sumPayments(r.monthFrom, r.monthTo, 0),
      refundedPaise: await sumPayments(r.monthFrom, r.monthTo, 1),
      lastMonthCollectedPaise: await sumPayments(r.lastMonthFrom, r.lastMonthTo, 0),
      expensesPaise: await sumExpenses(r.monthFrom, r.monthTo),
      admissions: num(admissions?.n),
      renewals: num(renewalsMonth?.n),
      endedThisMonth: num(rate?.ended),
      renewedOfEnded: num(rate?.renewed),
    },
    dailyCollections: dailyCollections.map((d) => ({ day: d.day, value: num(d.value) })),
    dailyAttendance: dailyAttendance.map((d) => ({ day: d.day, value: num(d.value) })),
    peakHours: peakHours.map((p) => ({ hour: Number(p.hour), count: num(p.count) })),
    followUpsDue: num(followUps?.n),
  };
}
