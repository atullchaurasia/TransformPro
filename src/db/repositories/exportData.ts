// Raw rows for export (spec §10.16). Deleted (Trash) rows are left out, like everywhere else.
import type { Dataset } from '@/domain/exportData';

import type { BindValue, Db } from '../types';

type Raw = Record<string, unknown>;

const QUERIES: Record<Dataset, { sql: string; dateExpr: string; idExpr: string | null; order: string }> = {
  members: {
    sql: 'SELECT m.*, st.name AS trainer_name FROM members m LEFT JOIN staff st ON st.id = m.assigned_trainer_id WHERE m.deleted_at IS NULL',
    dateExpr: 'm.joining_date',
    idExpr: 'm.id',
    order: 'm.member_code COLLATE NOCASE',
  },
  payments: {
    sql: `SELECT p.*, m.member_code, m.full_name, s.plan_name_snapshot AS plan_name, st.name AS staff_name
          FROM payments p JOIN members m ON m.id = p.member_id LEFT JOIN subscriptions s ON s.id = p.subscription_id LEFT JOIN staff st ON st.id = p.received_by
          WHERE p.deleted_at IS NULL AND m.deleted_at IS NULL`,
    dateExpr: 'p.paid_on',
    idExpr: 'p.member_id',
    order: 'p.paid_on, p.created_at',
  },
  attendance: {
    sql: 'SELECT a.*, m.member_code, m.full_name FROM attendance a JOIN members m ON m.id = a.member_id WHERE m.deleted_at IS NULL',
    dateExpr: 'a.date',
    idExpr: 'a.member_id',
    order: 'a.check_in_at',
  },
  expenses: {
    sql: 'SELECT e.*, c.name AS category FROM expenses e JOIN expense_categories c ON c.id = e.category_id WHERE e.deleted_at IS NULL',
    dateExpr: 'e.spent_on',
    idExpr: null,
    order: 'e.spent_on, e.created_at',
  },
  enquiries: {
    // created_at is a UTC timestamp; its first 10 characters are close enough for a date filter.
    sql: 'SELECT q.*, substr(q.created_at, 1, 10) AS created_on FROM enquiries q WHERE q.deleted_at IS NULL',
    dateExpr: 'substr(q.created_at, 1, 10)',
    idExpr: null,
    order: 'q.created_at',
  },
  measurements: {
    sql: 'SELECT x.*, m.member_code, m.full_name FROM measurements x JOIN members m ON m.id = x.member_id WHERE m.deleted_at IS NULL',
    dateExpr: 'x.measured_on',
    idExpr: 'x.member_id',
    order: 'x.measured_on',
  },
};

/** Rows for one dataset; `range` null = all time; `memberIds` limits to those members ("export selected"). */
export async function exportRows(db: Db, dataset: Dataset, range: { from: string; to: string } | null, memberIds?: string[]): Promise<Raw[]> {
  const q = QUERIES[dataset];
  let sql = q.sql;
  const params: BindValue[] = [];
  if (range) {
    sql += ` AND ${q.dateExpr} BETWEEN ? AND ?`;
    params.push(range.from, range.to);
  }
  if (memberIds && memberIds.length > 0 && q.idExpr) {
    sql += ` AND ${q.idExpr} IN (${memberIds.map(() => '?').join(', ')})`;
    params.push(...memberIds);
  }
  return db.getAllAsync<Raw>(`${sql} ORDER BY ${q.order}`, params);
}
