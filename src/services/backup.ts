// Backup & restore files on the phone (spec §10.15). File-system and SQLite work only — the
// archive format lives in `backupArchive.ts`, the rules in `@/domain/backup`.
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { backupDatabaseAsync, defaultDatabaseDirectory, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DB_NAME } from '@/db/client';
import { BACKUP_EXT, backupFileName, filesToPrune, type BackupKind, type BackupManifest } from '@/domain/backup';
import { logger } from '@/utils/logger';

import { packBackup, unpackBackup, type UnpackedBackup } from './backupArchive';

export const MANUAL_DIR = 'backups';
export const AUTO_DIR = 'auto-backups';
const PHOTOS_DIR = 'photos';

export class BackupError extends Error {
  constructor(public readonly reason: 'storage' | 'failed', cause?: unknown) {
    super(`Backup failed (${reason})`);
    if (cause) logger.warn('Backup error', cause);
  }
}

const isStorageFull = (e: unknown) => /space|ENOSPC|full|quota/i.test(String(e));

/** expo-sqlite wants a plain path, not a file:// URI. */
const toPath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // `digest` wants an ArrayBuffer-backed view; copy if this one sits on a SharedArrayBuffer-like buffer.
  const view = bytes.buffer instanceof ArrayBuffer ? (bytes as Uint8Array<ArrayBuffer>) : new Uint8Array(bytes);
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, view);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function dir(...parts: string[]): Directory {
  const d = new Directory(Paths.document, ...parts);
  d.create({ intermediates: true, idempotent: true });
  return d;
}

/** Every file under Documents/photos, as Documents-relative paths (how the DB stores them). */
function listPhotoFiles(d = new Directory(Paths.document, PHOTOS_DIR), prefix = PHOTOS_DIR): { path: string; file: File }[] {
  if (!d.exists) return [];
  const out: { path: string; file: File }[] = [];
  for (const entry of d.list()) {
    if (entry instanceof Directory) out.push(...listPhotoFiles(entry, `${prefix}/${entry.name}`));
    else out.push({ path: `${prefix}/${entry.name}`, file: entry });
  }
  return out;
}

/**
 * A consistent copy of the live DB via SQLite's online backup — pages still in the WAL are
 * included, which a plain file copy would miss (§10.15).
 */
async function snapshotDatabase(db: SQLiteDatabase, work: Directory): Promise<Uint8Array> {
  const copy = new File(work, 'db.sqlite');
  if (copy.exists) copy.delete();
  const dest = await openDatabaseAsync('db.sqlite', undefined, toPath(work.uri));
  try {
    await backupDatabaseAsync({ sourceDatabase: db, destDatabase: dest });
  } finally {
    await dest.closeAsync();
  }
  return copy.bytes();
}

export type CreatedBackup = { uri: string; name: string; size: number; manifest: BackupManifest };

/** Builds a .transformpro file. Manual ones go to the cache (then shared + copied); others straight to auto-backups. */
export async function createBackupFile(
  db: SQLiteDatabase,
  info: { kind: BackupKind; gymName: string; appVersion: string; schemaVersion: number; counts: Record<string, number>; now?: Date },
): Promise<CreatedBackup> {
  const now = info.now ?? new Date();
  const work = new Directory(Paths.cache, 'backup-work');
  try {
    if (work.exists) work.delete();
    work.create({ intermediates: true, idempotent: true });
    const dbBytes = await snapshotDatabase(db, work);
    const photos: { path: string; bytes: Uint8Array }[] = [];
    for (const p of listPhotoFiles()) photos.push({ path: p.path, bytes: await p.file.bytes() });

    const name = backupFileName(info.gymName, now, info.kind);
    const out = new File(info.kind === 'manual' ? new Directory(Paths.cache) : dir(AUTO_DIR), name);
    if (out.exists) out.delete();
    out.create();
    const manifest = await packBackup(
      { manifest: { format: 1, appVersion: info.appVersion, schemaVersion: info.schemaVersion, createdAt: now.toISOString(), gymName: info.gymName, counts: info.counts }, db: dbBytes, photos },
      sha256Hex,
      (chunk) => out.write(chunk, { append: true }),
    );
    return { uri: out.uri, name, size: out.size ?? 0, manifest };
  } catch (e) {
    throw new BackupError(isStorageFull(e) ? 'storage' : 'failed', e);
  } finally {
    try {
      if (work.exists) work.delete();
    } catch (e) {
      logger.warn('Cleaning backup work folder failed', e);
    }
  }
}

/** Keep a manual backup in Documents/backups (visible in the Files app) and prune to the newest 5. */
export async function keepManualCopy(uri: string, name: string, keep: number): Promise<void> {
  const d = dir(MANUAL_DIR);
  const target = new File(d, name);
  if (target.exists) target.delete();
  await new File(uri).copy(target);
  prune(MANUAL_DIR, 'manual', keep);
}

export function prune(folder: string, kind: BackupKind, keep: number): void {
  const d = dir(folder);
  const names = d.list().filter((e): e is File => e instanceof File).map((f) => f.name);
  for (const name of filesToPrune(names, kind, keep)) {
    try {
      new File(d, name).delete();
    } catch (e) {
      logger.warn('Pruning old backup failed', name, e);
    }
  }
}

export type LocalBackup = { name: string; uri: string; folder: 'backups' | 'auto-backups'; size: number; modified: number | null };

export function listLocalBackups(): LocalBackup[] {
  const out: LocalBackup[] = [];
  for (const folder of [MANUAL_DIR, AUTO_DIR] as const) {
    for (const entry of dir(folder).list()) {
      if (!(entry instanceof File) || !entry.name.endsWith(BACKUP_EXT)) continue;
      out.push({ name: entry.name, uri: entry.uri, folder, size: entry.size ?? 0, modified: entry.modificationTime ?? null });
    }
  }
  return out.sort((a, b) => b.name.localeCompare(a.name));
}

export function localBackupNames(folder: string): string[] {
  return dir(folder)
    .list()
    .filter((e): e is File => e instanceof File)
    .map((f) => f.name);
}

export function deleteLocalBackup(uri: string): void {
  const f = new File(uri);
  if (f.exists) f.delete();
}

export async function readBackup(uri: string): Promise<Awaited<ReturnType<typeof unpackBackup>>> {
  const bytes = await new File(uri).bytes();
  return unpackBackup(bytes, sha256Hex);
}

/**
 * Replaces the database file and the photos folder with the backup's. The DB MUST be closed
 * first (`closeDatabase`). The -wal/-shm files of the old database are removed too, otherwise
 * SQLite would replay old pages onto the restored file.
 */
export async function replaceDataFiles(backup: UnpackedBackup): Promise<void> {
  // expo-sqlite reports a plain path (…/Documents/SQLite); expo-file-system wants a URI.
  const raw = String(defaultDatabaseDirectory);
  const dbDir = new Directory(raw.startsWith('file://') ? raw : `file://${encodeURI(raw)}`);
  dbDir.create({ intermediates: true, idempotent: true });

  // 1. Write everything new under temporary names first: if the phone is full this fails
  //    while the current data is still untouched.
  const staged = new File(dbDir, `${DB_NAME}.restore`);
  staged.create({ overwrite: true });
  await staged.write(backup.db);
  const stagedPhotos = new Directory(Paths.document, `${PHOTOS_DIR}-restore`);
  if (stagedPhotos.exists) stagedPhotos.delete();
  for (const path of backup.photoPaths) {
    const parts = path.split('/').slice(1); // drop the leading "photos"
    const fileName = parts.pop() ?? '';
    const folder = new Directory(stagedPhotos, ...parts);
    folder.create({ intermediates: true, idempotent: true });
    const target = new File(folder, fileName);
    target.create({ overwrite: true });
    await target.write(await backup.readPhoto(path));
  }

  // 2. Swap: drop the old database (and its WAL/SHM) and photos, move the new ones in.
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const f = new File(dbDir, `${DB_NAME}${suffix}`);
    if (f.exists) f.delete();
  }
  await staged.move(new File(dbDir, DB_NAME));
  const photos = new Directory(Paths.document, PHOTOS_DIR);
  if (photos.exists) photos.delete();
  if (stagedPhotos.exists) await stagedPhotos.move(photos);
}
