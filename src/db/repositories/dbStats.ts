import type { Db } from '../types';

import type { TableName } from './base';

const TABLES: TableName[] = [
  'branches',
  'staff',
  'members',
  'plans',
  'subscriptions',
  'freezes',
  'payments',
  'attendance',
  'staff_attendance',
  'measurements',
  'enquiries',
  'enquiry_followups',
  'expense_categories',
  'expenses',
  'message_templates',
  'message_log',
  'audit_log',
];

/** Rows per table, for the backup manifest and the Backup screen (§10.15). */
export async function tableCounts(db: Db): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const table of TABLES) {
    const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`, []);
    out[table] = row?.n ?? 0;
  }
  return out;
}

/** Size of the database in bytes (pages × page size). */
export async function databaseSize(db: Db): Promise<number> {
  const pages = await db.getFirstAsync<{ page_count: number }>('PRAGMA page_count', []);
  const size = await db.getFirstAsync<{ page_size: number }>('PRAGMA page_size', []);
  return (pages?.page_count ?? 0) * (size?.page_size ?? 0);
}
