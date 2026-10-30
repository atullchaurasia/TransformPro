import type { Plan, PlanCategory } from '../models';
import type { Db } from '../types';

import { plansRepo } from './index';

export type PlanWithCount = Plan & { activeMembers: number };

/**
 * Plans in a category with the number of members currently on each (§10.3): subscriptions
 * that aren't cancelled and cover today (or are frozen), for members not in Trash.
 */
export async function listPlansWithCounts(db: Db, category: PlanCategory, today: string): Promise<PlanWithCount[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT p.*, (
       SELECT COUNT(DISTINCT s.member_id) FROM subscriptions s
       JOIN members m ON m.id = s.member_id AND m.deleted_at IS NULL
       WHERE s.plan_id = p.id AND s.status <> 'cancelled'
         AND (s.status = 'frozen' OR (s.start_date <= ? AND s.end_date >= ?))
     ) AS active_members
     FROM plans p
     WHERE p.deleted_at IS NULL AND p.category = ?
     ORDER BY p.sort_order, p.name COLLATE NOCASE`,
    [today, today, category],
  );
  return rows.map((r) => {
    const { active_members, ...rest } = r;
    return { ...plansRepo.fromRow(rest), activeMembers: Number(active_members ?? 0) };
  });
}

/** For pickers: active, not deleted (§10.3 "deactivate = hidden from pickers"). */
export async function listActivePlans(db: Db, category?: PlanCategory): Promise<Plan[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM plans WHERE deleted_at IS NULL AND is_active = 1 ${category ? 'AND category = ?' : ''}
     ORDER BY sort_order, name COLLATE NOCASE`,
    category ? [category] : [],
  );
  return rows.map(plansRepo.fromRow);
}

export async function nextPlanSortOrder(db: Db, category: PlanCategory): Promise<number> {
  const row = await db.getFirstAsync<{ n: number | null }>(
    'SELECT MAX(sort_order) AS n FROM plans WHERE category = ? AND deleted_at IS NULL',
    [category],
  );
  return (row?.n ?? -1) + 1;
}

export async function setPlanSortOrders(db: Db, orders: Map<string, number>): Promise<void> {
  for (const [id, sortOrder] of orders) await plansRepo.update(db, id, { sortOrder });
}
