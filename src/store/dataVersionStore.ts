import { create } from 'zustand';

type DataVersionState = { version: number; bump: () => void };

/**
 * Incremented after every committed write. List/screen hooks subscribe to `version` and
 * re-query when it changes, so screens refresh after any write (CLAUDE.md §4).
 */
export const useDataVersionStore = create<DataVersionState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

export const useDataVersion = () => useDataVersionStore((s) => s.version);
