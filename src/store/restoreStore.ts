import { create } from 'zustand';

import type { BackupManifest } from '@/domain/backup';
import type { UnpackedBackup } from '@/services/backupArchive';

/**
 * Restore hand-over (§10.15). The screen validates and confirms, then `DatabaseGate` takes
 * over: it unmounts the app and the SQLite provider, swaps the files, and remounts on the
 * restored database. `justRestored` lets the reopened app write the audit entry.
 */
type RestoreState = {
  phase: 'idle' | 'replacing' | 'failed';
  job: { backup: UnpackedBackup; manifest: BackupManifest } | null;
  error: string | null;
  justRestored: BackupManifest | null;
  begin: (job: { backup: UnpackedBackup; manifest: BackupManifest }) => void;
  done: (manifest: BackupManifest) => void;
  fail: (message: string) => void;
  reset: () => void;
  clearJustRestored: () => void;
};

export const useRestoreStore = create<RestoreState>((set) => ({
  phase: 'idle',
  job: null,
  error: null,
  justRestored: null,
  begin: (job) => set({ phase: 'replacing', job, error: null }),
  done: (manifest) => set({ phase: 'idle', job: null, justRestored: manifest }),
  fail: (error) => set({ phase: 'failed', job: null, error }),
  reset: () => set({ phase: 'idle', job: null, error: null }),
  clearJustRestored: () => set({ justRestored: null }),
}));
