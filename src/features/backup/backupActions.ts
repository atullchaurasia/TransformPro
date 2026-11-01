// Backup / restore flows for screens (§10.15). Native file work is in `services/backup.ts`.
import Constants from 'expo-constants';

import { closeDatabase, getDb, getSqliteDatabase, writeTransaction } from '@/db/client';
import { getSchemaVersion } from '@/db/migrate';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { writeAudit } from '@/db/repositories';
import { databaseSize, tableCounts } from '@/db/repositories/dbStats';
import { autoBackupDue, checkManifest, formatBytes, KEEP_AUTO, KEEP_MANUAL, KEEP_PRE_RESTORE, type BackupKind, type BackupManifest, type ManifestProblem } from '@/domain/backup';
import { todayISO } from '@/domain/dates';
import type { UnpackedBackup, UnpackProblem } from '@/services/backupArchive';
import { AUTO_DIR, createBackupFile, keepManualCopy, listLocalBackups, localBackupNames, prune, readBackup, type CreatedBackup } from '@/services/backup';
import { shareFile } from '@/services/pdf';
import { useRestoreStore } from '@/store/restoreStore';
import { getSettings, useSettingsStore } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

const appVersion = () => Constants.expoConfig?.version ?? '1.0.0';

async function build(kind: BackupKind): Promise<CreatedBackup> {
  const sqlite = getSqliteDatabase();
  return createBackupFile(sqlite, {
    kind,
    gymName: getSettings().gym_name,
    appVersion: appVersion(),
    schemaVersion: await getSchemaVersion(sqlite),
    counts: await tableCounts(sqlite),
  });
}

/**
 * "Back up now" (§10.15): build → keep a copy in Documents/backups (latest 5) → set
 * `last_backup_at` → audit. The caller then opens the share sheet with `shareBackup`.
 */
export async function backupNow(): Promise<CreatedBackup> {
  const created = await build('manual');
  await keepManualCopy(created.uri, created.name, KEEP_MANUAL);
  await useSettingsStore.getState().update({ last_backup_at: created.manifest.createdAt }, 'Backup created');
  await writeTransaction((tx) =>
    writeAudit(tx, { action: 'backup.create', entity: 'backup', summary: `Backup ${created.name} (${formatBytes(created.size)}, ${created.manifest.counts.members ?? 0} members)` }),
  );
  return created;
}

/** The share sheet for a .transformpro file. `public.data` so iOS doesn't append ".zip". */
export const shareBackup = (uri: string) => shareFile(uri, 'application/octet-stream', 'public.data');

/**
 * Daily automatic backup (§10.15) on the first open of the day, kept 7 days. These stay on the
 * phone, so they don't count as "backed up" for the dashboard reminder. Never throws.
 */
export async function runAutoBackupIfDue(): Promise<boolean> {
  try {
    if (!getSettings().onboarding_complete) return false;
    if (!autoBackupDue(localBackupNames(AUTO_DIR), todayISO())) return false;
    await build('auto');
    prune(AUTO_DIR, 'auto', KEEP_AUTO);
    return true;
  } catch (e) {
    logger.error('Daily auto-backup failed', e);
    return false;
  }
}

export async function loadBackupOverview() {
  const db = getDb();
  const counts = await tableCounts(db);
  return { counts, size: await databaseSize(db), backups: listLocalBackups() };
}

export type InspectResult =
  | { ok: true; manifest: BackupManifest; backup: UnpackedBackup }
  | { ok: false; problem: UnpackProblem | ManifestProblem | 'unreadable' };

/** Restore step 2 (§10.15): it's a ZIP, has a manifest, the checksum matches, the schema isn't newer. */
export async function inspectBackup(uri: string): Promise<InspectResult> {
  try {
    const r = await readBackup(uri);
    if (!r.ok) return r;
    const check = checkManifest(r.backup.manifestRaw, LATEST_SCHEMA_VERSION, r.backup.dbSha256);
    if (!check.ok) return check;
    return { ok: true, manifest: check.manifest, backup: r.backup };
  } catch (e) {
    logger.error('Reading backup failed', e);
    return { ok: false, problem: 'unreadable' };
  }
}

/**
 * Restore steps 4–5: safety backup of the current data first (if that fails, nothing is
 * touched), then close the DB and hand over to `DatabaseGate`, which swaps the files.
 */
export async function startRestore(backup: UnpackedBackup, manifest: BackupManifest): Promise<void> {
  await build('pre-restore');
  prune(AUTO_DIR, 'pre-restore', KEEP_PRE_RESTORE);
  await closeDatabase();
  useRestoreStore.getState().begin({ backup, manifest });
}

/** After the restored DB is open again: audit entry (step 6). */
export async function logRestore(manifest: BackupManifest): Promise<void> {
  await writeTransaction((tx) =>
    writeAudit(tx, {
      action: 'backup.restore',
      entity: 'backup',
      summary: `Restored backup from ${manifest.createdAt} (${manifest.counts.members ?? 0} members, ${manifest.counts.payments ?? 0} payments)`,
      staffId: null,
    }),
  );
}
