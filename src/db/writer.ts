import type { Db, RootDb } from './types';

export type Writer = <T>(task: (tx: Db) => Promise<T>) => Promise<T>;

/**
 * Serialised write transactions on the MAIN connection.
 *
 * Why not expo-sqlite's `withExclusiveTransactionAsync`? It opens a second connection and
 * immediately runs BEGIN — and `PRAGMA foreign_keys` is per-connection and a no-op inside a
 * transaction, so writes there would silently skip foreign-key checks (CLAUDE.md §13).
 * Instead every write goes through this queue: one `BEGIN … COMMIT` at a time on the main
 * connection (where foreign keys are ON), and a failure rolls the whole unit back (§4).
 * Reads may run concurrently; inside the app they can only observe committed or
 * in-progress data of the single writer, which is acceptable for one device.
 */
export function createWriter(db: RootDb, onCommitted?: () => void): Writer {
  let tail: Promise<unknown> = Promise.resolve();

  return function write<T>(task: (tx: Db) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      let result: T | undefined;
      await db.withTransactionAsync(async () => {
        result = await task(db);
      });
      onCommitted?.();
      return result as T;
    };
    const next = tail.then(run, run);
    tail = next.catch(() => undefined);
    return next;
  };
}
