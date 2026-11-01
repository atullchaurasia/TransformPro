import { create } from 'zustand';

/**
 * Kiosk mode for a front-desk iPad (§10.4): scanner only, tabs hidden, screen kept awake,
 * PIN to exit. Session state only — a restart always comes back out of kiosk mode.
 */
type KioskState = {
  active: boolean;
  frontCamera: boolean;
  /** Staff member who started the kiosk — their PIN (or the owner's) ends it. */
  startedBy: string | null;
  start: (staffId: string | null) => void;
  exit: () => void;
  setFrontCamera: (front: boolean) => void;
};

export const useKioskStore = create<KioskState>((set) => ({
  active: false,
  frontCamera: false,
  startedBy: null,
  start: (startedBy) => set({ active: true, startedBy }),
  exit: () => set({ active: false, startedBy: null }),
  setFrontCamera: (frontCamera) => set({ frontCamera }),
}));

export const useKioskActive = () => useKioskStore((s) => s.active);
