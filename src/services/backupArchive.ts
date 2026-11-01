// The .transformpro container (spec §10.15): a ZIP with manifest.json, db.sqlite and photos/…
// No native code here — the caller supplies bytes and a SHA-256 function — so the format is
// tested in jest exactly as the app uses it.
import JSZip from 'jszip';

import type { BackupManifest } from '@/domain/backup';

export type Sha256 = (bytes: Uint8Array) => Promise<string>;

export type PackInput = {
  manifest: Omit<BackupManifest, 'dbSha256' | 'photoCount'>;
  db: Uint8Array;
  /** Paths relative to Documents, e.g. 'photos/members/<id>.jpg'. */
  photos: { path: string; bytes: Uint8Array }[];
};

/**
 * Builds the archive. Files are STOREd (JPEGs and SQLite pages barely compress, and it keeps
 * memory and CPU low on the phone). `onChunk` receives the output in pieces so the caller can
 * stream it to disk instead of holding a second full copy in memory.
 */
export async function packBackup(input: PackInput, sha256: Sha256, onChunk: (chunk: Uint8Array) => Promise<void>): Promise<BackupManifest> {
  const manifest: BackupManifest = { ...input.manifest, dbSha256: await sha256(input.db), photoCount: input.photos.length };
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('db.sqlite', input.db, { binary: true });
  for (const p of input.photos) zip.file(p.path, p.bytes, { binary: true });

  await new Promise<void>((resolve, reject) => {
    const stream = zip.generateInternalStream({ type: 'uint8array', compression: 'STORE', streamFiles: true });
    let failed = false;
    stream
      .on('data', (chunk: Uint8Array) => {
        stream.pause();
        onChunk(chunk).then(
          () => stream.resume(),
          (e: unknown) => {
            failed = true;
            reject(e);
          },
        );
      })
      .on('error', (e: Error) => reject(e))
      .on('end', () => {
        if (!failed) resolve();
      });
    stream.resume();
  });
  return manifest;
}

export type UnpackedBackup = {
  manifestRaw: unknown;
  db: Uint8Array;
  dbSha256: string;
  /** Photo entries, read lazily so a big backup isn't decoded all at once. */
  photoPaths: string[];
  readPhoto: (path: string) => Promise<Uint8Array>;
};

export type UnpackProblem = 'not_zip' | 'no_manifest' | 'no_database';

export async function unpackBackup(bytes: Uint8Array, sha256: Sha256): Promise<{ ok: true; backup: UnpackedBackup } | { ok: false; problem: UnpackProblem }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return { ok: false, problem: 'not_zip' };
  }
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) return { ok: false, problem: 'no_manifest' };
  const dbFile = zip.file('db.sqlite');
  if (!dbFile) return { ok: false, problem: 'no_database' };
  let manifestRaw: unknown = null;
  try {
    manifestRaw = JSON.parse(await manifestFile.async('string'));
  } catch {
    manifestRaw = null;
  }
  const db = await dbFile.async('uint8array');
  // Only plain relative paths under photos/ are accepted — never "../" tricks.
  const photoPaths = Object.keys(zip.files).filter((p) => p.startsWith('photos/') && !p.endsWith('/') && !p.split('/').includes('..'));
  return {
    ok: true,
    backup: {
      manifestRaw,
      db,
      dbSha256: await sha256(db),
      photoPaths,
      readPhoto: async (path) => {
        const f = zip.file(path);
        if (!f) throw new Error(`Missing ${path}`);
        return f.async('uint8array');
      },
    },
  };
}
