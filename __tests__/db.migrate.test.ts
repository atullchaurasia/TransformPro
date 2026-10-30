import { getSchemaVersion, planMigrations, runMigrations } from '@/db/migrate';
import { LATEST_SCHEMA_VERSION, MIGRATIONS, type Migration } from '@/db/migrations';

import { createTestDb } from './helpers/nodeDb';

const EXPECTED_TABLES = [
  'attendance',
  'audit_log',
  'branches',
  'enquiries',
  'enquiry_followups',
  'expense_categories',
  'expenses',
  'freezes',
  'measurements',
  'members',
  'message_log',
  'message_templates',
  'payments',
  'plans',
  'settings',
  'staff',
  'staff_attendance',
  'subscriptions',
];

describe('migrations', () => {
  it('creates all 18 spec tables on a fresh DB and sets user_version', async () => {
    const db = createTestDb();
    const before = jest.fn();
    await runMigrations(db, MIGRATIONS, { beforeMigrate: before });

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      [],
    );
    expect(tables.map((t) => t.name)).toEqual(EXPECTED_TABLES);
    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    // No safety backup for a brand-new, empty database.
    expect(before).not.toHaveBeenCalled();
  });

  it('every table has created_at and updated_at (CLAUDE.md §4)', async () => {
    const db = createTestDb();
    await runMigrations(db, MIGRATIONS);
    for (const table of EXPECTED_TABLES) {
      const cols = (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`, [])).map((c) => c.name);
      expect(cols).toEqual(expect.arrayContaining(['created_at', 'updated_at']));
    }
  });

  it('is a no-op when already up to date', async () => {
    const db = createTestDb();
    await runMigrations(db, MIGRATIONS);
    const plan = await runMigrations(db, MIGRATIONS);
    expect(plan.pending).toHaveLength(0);
  });

  const v2: Migration = { version: 2, name: 'add_test', up: (db) => db.execAsync('ALTER TABLE branches ADD COLUMN test_col TEXT') };

  it('takes a safety backup before upgrading an existing DB', async () => {
    const db = createTestDb();
    await runMigrations(db, MIGRATIONS);
    const before = jest.fn().mockResolvedValue(undefined);
    await runMigrations(db, [...MIGRATIONS, v2], { beforeMigrate: before });
    expect(before).toHaveBeenCalledWith(expect.objectContaining({ fromVersion: 1, toVersion: 2 }));
    expect(await getSchemaVersion(db)).toBe(2);
  });

  it('does NOT migrate when the safety backup fails', async () => {
    const db = createTestDb();
    await runMigrations(db, MIGRATIONS);
    const failingBackup = jest.fn().mockRejectedValue(new Error('disk full'));
    await expect(runMigrations(db, [...MIGRATIONS, v2], { beforeMigrate: failingBackup })).rejects.toThrow('disk full');
    expect(await getSchemaVersion(db)).toBe(1);
  });

  it('rolls back a failing migration and keeps the previous version', async () => {
    const db = createTestDb();
    await runMigrations(db, MIGRATIONS);
    const broken: Migration = {
      version: 2,
      name: 'broken',
      up: async (d) => {
        await d.execAsync('ALTER TABLE branches ADD COLUMN half_done TEXT');
        await d.execAsync('THIS IS NOT SQL');
      },
    };
    await expect(runMigrations(db, [...MIGRATIONS, broken])).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(1);
    const cols = (await db.getAllAsync<{ name: string }>('PRAGMA table_info(branches)', [])).map((c) => c.name);
    expect(cols).not.toContain('half_done');
  });

  it('refuses a database from a newer app version', () => {
    expect(() => planMigrations(99, MIGRATIONS)).toThrow(/newer than this app/);
  });

  it('rejects out-of-order migration lists', () => {
    expect(() => planMigrations(0, [v2, ...MIGRATIONS])).toThrow(/out of order/);
  });
});
