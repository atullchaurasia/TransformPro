import type { Db } from '../types';

/**
 * A schema migration. NEVER edit a migration that has shipped — add a new one (spec §5.3).
 * `up` runs inside a transaction; don't put PRAGMAs that are no-ops in transactions here.
 */
export type Migration = {
  version: number;
  name: string;
  up: (db: Db) => Promise<void>;
};
