import { migration001Init } from './001_init';
import type { Migration } from './types';

/** All migrations in order. Append only — never edit or reorder shipped ones (spec §5.3). */
export const MIGRATIONS: readonly Migration[] = [migration001Init];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

export type { Migration } from './types';
