import { create } from 'zustand';

/** Members chosen in the list for "Export selected" (too many ids for a route param). */
type ExportSelection = { memberIds: string[] | null; set: (ids: string[] | null) => void };

export const useExportSelection = create<ExportSelection>((set) => ({ memberIds: null, set: (memberIds) => set({ memberIds }) }));
