// The subset of expo-sqlite's SQLiteDatabase that our code depends on. Repositories take
// a `Db` argument instead of importing expo-sqlite, so unit tests can run them against a
// real SQLite engine (node:sqlite) — see __tests__/helpers/nodeDb.ts.

export type BindValue = string | number | null | boolean | Uint8Array;
export type BindParams = BindValue[] | Record<string, BindValue>;

export type RunResult = { lastInsertRowId: number; changes: number };

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: BindParams): Promise<RunResult>;
  getFirstAsync<T>(sql: string, params: BindParams): Promise<T | null>;
  getAllAsync<T>(sql: string, params: BindParams): Promise<T[]>;
}

/** The app's single connection: can also open a transaction on itself. */
export interface RootDb extends Db {
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
