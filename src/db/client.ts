import type { SQLiteDatabase } from 'expo-sqlite';

import { useDataVersionStore } from '@/store/dataVersionStore';

import { runMigrations } from './migrate';
import { MIGRATIONS } from './migrations';
import { createPreMigrationBackup } from './safetyBackup';
import type { Db } from './types';
import { createWriter, type Writer } from './writer';

export const DB_NAME = 'transformpro.db';

let database: SQLiteDatabase | null = null;
let writer: Writer | null = null;

/**
 * `<SQLiteProvider onInit>`: connection pragmas, then migrations (with a safety backup
 * first when an existing DB is upgraded), then exposes the connection to repositories.
 */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  // Both pragmas must run outside any transaction (journal_mode can't change inside one,
  // foreign_keys is a no-op inside one).
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(db, MIGRATIONS, {
    beforeMigrate: async (plan) => {
      await createPreMigrationBackup(db, plan);
    },
  });

  database = db;
  writer = createWriter(db, () => useDataVersionStore.getState().bump());
}

/** The open connection, for reads. Throws if called before the DB is initialised. */
export function getDb(): Db {
  if (!database) throw new Error('Database not initialised yet');
  return database;
}

/**
 * Run a unit of work as ONE transaction (CLAUDE.md §4). Every write in the app goes through
 * this. Do all statements on the `tx` argument, and never call `writeTransaction` again
 * from inside a task — writes are queued, so a nested call would wait forever.
 */
export function writeTransaction<T>(task: (tx: Db) => Promise<T>): Promise<T> {
  if (!writer) throw new Error('Database not initialised yet');
  return writer(task);
}
