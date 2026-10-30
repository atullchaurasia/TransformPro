import type { Migration } from './migrations/types';
import type { RootDb } from './types';

export type MigrationPlan = { fromVersion: number; toVersion: number; pending: Migration[] };

export type MigrateOptions = {
  /**
   * Called once before migrating a database that already has a schema (fromVersion > 0),
   * to take a safety backup (spec §5.3). If it throws, NO migration runs — we never alter
   * existing gym data without a safety copy (CLAUDE.md §0 rule 4).
   */
  beforeMigrate?: (plan: MigrationPlan) => Promise<void>;
};

export async function getSchemaVersion(db: RootDb): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  return row?.user_version ?? 0;
}

export function planMigrations(currentVersion: number, migrations: readonly Migration[]): MigrationPlan {
  const versions = migrations.map((m) => m.version);
  versions.forEach((v, i) => {
    if (i > 0 && v <= (versions[i - 1] ?? 0)) throw new Error(`Migrations out of order at version ${v}`);
  });
  const latest = versions[versions.length - 1] ?? 0;
  if (currentVersion > latest) {
    // A backup from a newer app version was restored, or the app was downgraded.
    throw new Error(`Database schema v${currentVersion} is newer than this app (v${latest}). Update the app.`);
  }
  const pending = migrations.filter((m) => m.version > currentVersion);
  return { fromVersion: currentVersion, toVersion: latest, pending };
}

/**
 * Runs pending migrations in order. Each migration runs in its own transaction together
 * with its `PRAGMA user_version` bump, so a failure leaves the DB at the last good version.
 */
export async function runMigrations(db: RootDb, migrations: readonly Migration[], options: MigrateOptions = {}): Promise<MigrationPlan> {
  const plan = planMigrations(await getSchemaVersion(db), migrations);
  if (plan.pending.length === 0) return plan;

  if (plan.fromVersion > 0 && options.beforeMigrate) await options.beforeMigrate(plan);

  for (const migration of plan.pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      // PRAGMA can't take bound parameters; version is a trusted integer from code.
      await db.execAsync(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
  }
  return plan;
}
