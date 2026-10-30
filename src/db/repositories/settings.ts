import { isValidSettingValue, resolveSettings, type AppSettings, type SettingKey } from '@/domain/settings';
import { nowIso } from '@/utils/id';

import type { Db } from '../types';

// Key/value store; values are JSON-encoded (spec §5.2). Typed keys and defaults live in
// `@/domain/settings`.

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
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value) as unknown;
    } catch {
      // A corrupt value falls back to its default in resolveSettings.
    }
  }
  return out;
}

/** Every setting, typed, with defaults filled in. */
export async function loadSettings(db: Db): Promise<AppSettings> {
  return resolveSettings(await getAllSettings(db));
}

/** Validates and writes several settings. Throws on an invalid value so bad data never lands. */
export async function saveSettings(db: Db, patch: Partial<AppSettings>): Promise<SettingKey[]> {
  const keys = Object.keys(patch) as SettingKey[];
  for (const key of keys) {
    if (!isValidSettingValue(key, patch[key])) throw new Error(`Invalid value for setting "${key}"`);
  }
  for (const key of keys) await setSetting(db, key, patch[key]);
  return keys;
}
