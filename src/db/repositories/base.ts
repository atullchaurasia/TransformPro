import { newId, nowIso } from '@/utils/id';

import type { NewRow, RowPatch } from '../models';
import type { BindValue, Db } from '../types';

export type TableName =
  | 'branches'
  | 'staff'
  | 'members'
  | 'plans'
  | 'subscriptions'
  | 'freezes'
  | 'payments'
  | 'attendance'
  | 'staff_attendance'
  | 'measurements'
  | 'enquiries'
  | 'enquiry_followups'
  | 'expense_categories'
  | 'expenses'
  | 'message_templates'
  | 'message_log'
  | 'audit_log';

export const camelToSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
export const snakeToCamel = (col: string) => col.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

type Row = Record<string, unknown>;

// Real column names per table, read once from SQLite. Used to reject unknown keys, so a
// typo or a stray form field can never become part of an SQL statement.
const columnCache = new WeakMap<Db, Map<string, Set<string>>>();

async function columnsOf(db: Db, table: TableName): Promise<Set<string>> {
  let perDb = columnCache.get(db);
  if (!perDb) columnCache.set(db, (perDb = new Map()));
  let cols = perDb.get(table);
  if (!cols) {
    const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`, []);
    if (info.length === 0) throw new Error(`Unknown table ${table}`);
    cols = new Set(info.map((c) => c.name));
    perDb.set(table, cols);
  }
  return cols;
}

export type RepositoryConfig<M> = {
  table: TableName;
  /** Model keys stored as INTEGER 0/1. */
  booleans?: (keyof M & string)[];
  /** Table has `deleted_at` (Trash). */
  softDelete?: boolean;
};

export type ListOptions<M> = {
  includeDeleted?: boolean;
  orderBy?: keyof M & string;
  direction?: 'ASC' | 'DESC';
  limit?: number;
};

export function createRepository<M extends { id: string }>(config: RepositoryConfig<M>) {
  const { table, softDelete = false } = config;
  const booleans = new Set<string>(config.booleans ?? []);

  const fromRow = (row: Row): M => {
    const out: Row = {};
    for (const [col, value] of Object.entries(row)) {
      const key = snakeToCamel(col);
      out[key] = booleans.has(key) ? value === 1 || value === true : value;
    }
    return out as M;
  };

  async function toColumns(db: Db, data: Row): Promise<[string[], BindValue[]]> {
    const valid = await columnsOf(db, table);
    const cols: string[] = [];
    const values: BindValue[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const col = camelToSnake(key);
      if (!valid.has(col)) throw new Error(`${table} has no column "${col}"`);
      cols.push(col);
      values.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value as BindValue));
    }
    return [cols, values];
  }

  const notDeleted = softDelete ? ' AND deleted_at IS NULL' : '';

  async function getById(db: Db, id: string, opts: { includeDeleted?: boolean } = {}): Promise<M | null> {
    const filter = opts.includeDeleted ? '' : notDeleted;
    const row = await db.getFirstAsync<Row>(`SELECT * FROM ${table} WHERE id = ?${filter}`, [id]);
    return row ? fromRow(row) : null;
  }

  return {
    table,
    fromRow,
    getById,

    async create(db: Db, input: NewRow<M>): Promise<M> {
      const now = nowIso();
      const data: Row = { ...input, id: input.id ?? newId(), createdAt: now, updatedAt: now };
      const [cols, values] = await toColumns(db, data);
      await db.runAsync(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values);
      const created = await getById(db, data.id as string, { includeDeleted: true });
      if (!created) throw new Error(`Insert into ${table} failed`);
      return created;
    },

    async list(db: Db, opts: ListOptions<M> = {}): Promise<M[]> {
      const where = softDelete && !opts.includeDeleted ? 'WHERE deleted_at IS NULL' : '';
      let order = '';
      if (opts.orderBy) {
        const col = camelToSnake(opts.orderBy);
        if (!(await columnsOf(db, table)).has(col)) throw new Error(`${table} has no column "${col}"`);
        order = `ORDER BY ${col} ${opts.direction === 'DESC' ? 'DESC' : 'ASC'}`;
      }
      const limit = opts.limit ? `LIMIT ${Math.trunc(opts.limit)}` : '';
      const rows = await db.getAllAsync<Row>(`SELECT * FROM ${table} ${where} ${order} ${limit}`, []);
      return rows.map(fromRow);
    },

    async count(db: Db, opts: { includeDeleted?: boolean } = {}): Promise<number> {
      const where = softDelete && !opts.includeDeleted ? 'WHERE deleted_at IS NULL' : '';
      const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} ${where}`, []);
      return row?.n ?? 0;
    },

    async update(db: Db, id: string, patch: RowPatch<M>): Promise<M> {
      const [cols, values] = await toColumns(db, { ...patch, updatedAt: nowIso() } as Row);
      const result = await db.runAsync(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...values, id]);
      if (result.changes === 0) throw new Error(`${table} row ${id} not found`);
      const updated = await getById(db, id, { includeDeleted: true });
      if (!updated) throw new Error(`${table} row ${id} not found`);
      return updated;
    },

    /** Move to Trash (spec §13: never hard-delete from normal UI). */
    async softDelete(db: Db, id: string): Promise<void> {
      if (!softDelete) throw new Error(`${table} does not support soft delete`);
      const now = nowIso();
      const r = await db.runAsync(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`, [now, now, id]);
      if (r.changes === 0) throw new Error(`${table} row ${id} not found or already deleted`);
    },

    async restore(db: Db, id: string): Promise<void> {
      if (!softDelete) throw new Error(`${table} does not support soft delete`);
      const r = await db.runAsync(`UPDATE ${table} SET deleted_at = NULL, updated_at = ? WHERE id = ?`, [nowIso(), id]);
      if (r.changes === 0) throw new Error(`${table} row ${id} not found`);
    },

    /** Permanent delete — Trash "Delete permanently" / owner-only flows only. */
    async hardDelete(db: Db, id: string): Promise<void> {
      await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
    },
  };
}

export type Repository<M extends { id: string }> = ReturnType<typeof createRepository<M>>;
