// Backup file rules (spec §10.15). Pure: names, manifest checks, which old copies to delete.
import { format } from 'date-fns';

export const BACKUP_EXT = '.transformpro';
/** Manual "Back up now" copies kept in Documents/backups (§10.15). */
export const KEEP_MANUAL = 5;
/** Daily automatic copies kept in Documents/auto-backups (§10.15). */
export const KEEP_AUTO = 7;
/** Safety copies taken right before a restore. */
export const KEEP_PRE_RESTORE = 3;

export type BackupKind = 'manual' | 'auto' | 'pre-restore';

const PREFIX: Record<BackupKind, string> = { manual: 'TransformPro-Backup', auto: 'TransformPro-Auto', 'pre-restore': 'TransformPro-PreRestore' };

/** File-name-safe gym name: letters, digits and dashes, at most 30 characters. */
export function slugGym(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .slice(0, 30)
    .replace(/-+$/g, '');
  return slug || 'Gym';
}

/** `TransformPro-Backup-<gymname>-YYYY-MM-DD-HHmm.transformpro` (§10.15). */
export function backupFileName(gymName: string, at: Date, kind: BackupKind = 'manual'): string {
  return `${PREFIX[kind]}-${slugGym(gymName)}-${format(at, 'yyyy-MM-dd-HHmm')}${BACKUP_EXT}`;
}

export function backupKindOf(fileName: string): BackupKind | null {
  if (!fileName.endsWith(BACKUP_EXT)) return null;
  for (const [kind, prefix] of Object.entries(PREFIX) as [BackupKind, string][]) if (fileName.startsWith(`${prefix}-`)) return kind;
  return null;
}

/** The 'YYYY-MM-DD-HHmm' stamp at the end of a backup name (sorts chronologically). */
export function backupStamp(fileName: string): string | null {
  const m = /(\d{4}-\d{2}-\d{2}-\d{4})\.transformpro$/.exec(fileName);
  return m?.[1] ?? null;
}

/** Oldest-first list of files to delete so only the newest `keep` of `kind` remain. */
export function filesToPrune(fileNames: string[], kind: BackupKind, keep: number): string[] {
  const ours = fileNames.filter((n) => backupKindOf(n) === kind).sort((a, b) => (backupStamp(b) ?? '').localeCompare(backupStamp(a) ?? ''));
  return ours.slice(keep);
}

/** One automatic backup per day, on the first app open (§10.15). */
export function autoBackupDue(fileNames: string[], today: string): boolean {
  return !fileNames.some((n) => backupKindOf(n) === 'auto' && backupStamp(n)?.startsWith(today));
}

export type BackupManifest = {
  format: 1;
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  gymName: string;
  counts: Record<string, number>;
  /** SHA-256 (hex) of db.sqlite. */
  dbSha256: string;
  photoCount: number;
};

export type ManifestProblem = 'bad_manifest' | 'newer_schema' | 'checksum';

/** Restore check (§10.15): a manifest we understand, a schema ≤ ours, and a matching checksum. */
export function checkManifest(raw: unknown, latestSchema: number, actualSha256: string | null): { ok: true; manifest: BackupManifest } | { ok: false; problem: ManifestProblem } {
  const m = raw as Partial<BackupManifest> | null;
  if (!m || typeof m !== 'object' || m.format !== 1 || typeof m.schemaVersion !== 'number' || typeof m.dbSha256 !== 'string' || typeof m.createdAt !== 'string' || !m.counts) {
    return { ok: false, problem: 'bad_manifest' };
  }
  if (m.schemaVersion > latestSchema) return { ok: false, problem: 'newer_schema' };
  if (!actualSha256 || actualSha256.toLowerCase() !== m.dbSha256.toLowerCase()) return { ok: false, problem: 'checksum' };
  return { ok: true, manifest: m as BackupManifest };
}

/** "1.4 MB" — backup sizes. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
