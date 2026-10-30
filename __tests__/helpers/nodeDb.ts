import type { BindParams, BindValue, RootDb } from '@/db/types';

// Real SQLite (Node 24 built-in) behind the same interface the app uses, so schema,
// migrations and repositories are tested against a real engine — not mocks.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => {
    exec(sql: string): void;
    prepare(sql: string): {
      run(...p: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
      get(...p: unknown[]): unknown;
      all(...p: unknown[]): unknown[];
    };
    close(): void;
  };
};

const toNode = (v: BindValue) => (typeof v === 'boolean' ? (v ? 1 : 0) : v);

function args(params: BindParams): unknown[] {
  if (Array.isArray(params)) return params.map(toNode);
  return [Object.fromEntries(Object.entries(params).map(([k, v]) => [k, toNode(v)]))];
}

// node:sqlite returns null-prototype objects; normalise for toEqual comparisons.
const plain = <T>(row: unknown): T => ({ ...(row as object) }) as T;

export type TestDb = RootDb & { close(): void; execCount: () => number };

export function createTestDb(): TestDb {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  let execs = 0;
  return {
    async execAsync(sql) {
      execs++;
      raw.exec(sql);
    },
    async runAsync(sql, params) {
      const r = raw.prepare(sql).run(...args(params));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync<T>(sql: string, params: BindParams) {
      const row = raw.prepare(sql).get(...args(params));
      return row === undefined ? null : plain<T>(row);
    },
    async getAllAsync<T>(sql: string, params: BindParams) {
      return raw.prepare(sql).all(...args(params)).map((r) => plain<T>(r));
    },
    async withTransactionAsync(task) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => raw.close(),
    execCount: () => execs,
  };
}
