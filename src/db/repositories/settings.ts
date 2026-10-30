import { nowIso } from '@/utils/id';

import type { Db } from '../types';

// Key/value store; values are JSON-encoded (spec §5.2). Typed keys and defaults are
// layered on top in M04 (settings store).

export async function getSetting<T>(db: Db, key: string): Promise<T | undefined> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? (JSON.parse(row.value) as T) : undefined;
}

export async function setSetting(db: Db, key: string, value: unknown): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), now, now],
  );
}

export async function getAllSettings(db: Db): Promise<Record<string, unknown>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings', []);
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value) as unknown]));
}
