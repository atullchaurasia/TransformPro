import { randomUUID } from 'expo-crypto';

/** New primary key: a TEXT UUID (CLAUDE.md §4). */
export function newId(): string {
  return randomUUID();
}

/** Current timestamp as full ISO, e.g. 2026-10-29T18:30:00.000Z (CLAUDE.md §4). */
export function nowIso(): string {
  return new Date().toISOString();
}
