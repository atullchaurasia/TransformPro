import { Directory, Paths } from 'expo-file-system';
import { backupDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { logger } from '@/utils/logger';

import type { MigrationPlan } from './migrate';

export const AUTO_BACKUP_DIR = 'auto-backups';

/** expo-sqlite wants a plain filesystem path, not a file:// URI. */
function toPath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ''));
}

function stamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

/**
 * Consistent copy of the live database into Documents/auto-backups/ before migrating
 * (spec §5.3). Uses SQLite's online-backup API rather than copying the file, so pages still
 * in the WAL are included. The folder is visible in the iOS Files app (UIFileSharingEnabled).
 */
export async function createPreMigrationBackup(db: SQLiteDatabase, plan: MigrationPlan): Promise<string> {
  const dir = new Directory(Paths.document, AUTO_BACKUP_DIR);
  dir.create({ intermediates: true, idempotent: true });
  const name = `pre-migration-v${plan.fromVersion}-to-v${plan.toVersion}-${stamp()}.db`;

  const dest = await openDatabaseAsync(name, undefined, toPath(dir.uri));
  try {
    await backupDatabaseAsync({ sourceDatabase: db, destDatabase: dest });
  } finally {
    await dest.closeAsync();
  }
  logger.info('Pre-migration safety backup written', name);
  return name;
}
