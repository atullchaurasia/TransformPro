import { autoBackupDue, backupFileName, backupKindOf, checkManifest, filesToPrune, formatBytes, slugGym } from '@/domain/backup';
import { packBackup, unpackBackup } from '@/services/backupArchive';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHash } = require('node:crypto') as { createHash: (a: string) => { update: (b: Uint8Array) => { digest: (e: string) => string } } };
const sha256 = async (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

describe('backup names and housekeeping (§10.15)', () => {
  it('names files TransformPro-Backup-<gym>-YYYY-MM-DD-HHmm.transformpro', () => {
    const at = new Date(2026, 9, 12, 7, 5);
    expect(backupFileName('Iron Paradise Gym!', at)).toBe('TransformPro-Backup-Iron-Paradise-Gym-2026-10-12-0705.transformpro');
    expect(backupFileName('', at, 'auto')).toBe('TransformPro-Auto-Gym-2026-10-12-0705.transformpro');
    expect(slugGym('शक्ति Fitness')).toBe('Fitness');
    expect(backupKindOf('TransformPro-PreRestore-Gym-2026-10-12-0705.transformpro')).toBe('pre-restore');
    expect(backupKindOf('pre-migration-v1-to-v2.db')).toBeNull();
  });

  it('keeps the newest N of each kind and runs the auto backup once a day', () => {
    const names = ['a', '2026-10-10-0800', '2026-10-12-0800', '2026-10-11-0800', '2026-10-09-0800'].map((s, i) => (i === 0 ? 'notes.txt' : `TransformPro-Auto-Gym-${s}.transformpro`));
    names.push('TransformPro-Backup-Gym-2026-01-01-0000.transformpro');
    expect(filesToPrune(names, 'auto', 2)).toEqual(['TransformPro-Auto-Gym-2026-10-10-0800.transformpro', 'TransformPro-Auto-Gym-2026-10-09-0800.transformpro']);
    expect(filesToPrune(names, 'manual', 5)).toEqual([]);
    expect(autoBackupDue(names, '2026-10-12')).toBe(false);
    expect(autoBackupDue(names, '2026-10-13')).toBe(true);
    expect(formatBytes(1536)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});

describe('archive round trip', () => {
  const manifest = { format: 1 as const, appVersion: '1.0.0', schemaVersion: 2, createdAt: '2026-10-12T07:05:00.000Z', gymName: 'Iron', counts: { members: 3 } };

  it('packs manifest + db + photos and unpacks them byte for byte with a valid checksum', async () => {
    const db = new Uint8Array([83, 81, 76, 105, 116, 101, 0, 1, 2, 3]);
    const photo = new Uint8Array(5000).map((_, i) => i % 251);
    const chunks: Uint8Array[] = [];
    const written = await packBackup({ manifest, db, photos: [{ path: 'photos/members/a.jpg', bytes: photo }] }, sha256, async (c) => {
      chunks.push(c);
    });
    expect(written.photoCount).toBe(1);
    const all = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
    let off = 0;
    for (const c of chunks) {
      all.set(c, off);
      off += c.length;
    }

    const r = await unpackBackup(all, sha256);
    if (!r.ok) throw new Error(r.problem);
    expect(Array.from(r.backup.db)).toEqual(Array.from(db));
    expect(r.backup.photoPaths).toEqual(['photos/members/a.jpg']);
    expect((await r.backup.readPhoto('photos/members/a.jpg')).length).toBe(5000);
    expect(checkManifest(r.backup.manifestRaw, 2, r.backup.dbSha256)).toMatchObject({ ok: true, manifest: { counts: { members: 3 } } });
    expect(checkManifest(r.backup.manifestRaw, 1, r.backup.dbSha256)).toEqual({ ok: false, problem: 'newer_schema' });
    expect(checkManifest(r.backup.manifestRaw, 2, 'deadbeef')).toEqual({ ok: false, problem: 'checksum' });
    expect(checkManifest({ hello: 1 }, 2, r.backup.dbSha256)).toEqual({ ok: false, problem: 'bad_manifest' });
  });

  it('rejects files that are not backups', async () => {
    expect(await unpackBackup(new Uint8Array([1, 2, 3]), sha256)).toEqual({ ok: false, problem: 'not_zip' });
  });
});
