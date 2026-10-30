import { create } from 'zustand';

import type { StaffRole } from '@/db/models';

/** What the app needs to know about whoever is using it (spec §8). */
export type SessionStaff = {
  id: string;
  name: string;
  role: StaffRole;
  /** JSON array of permission keys (§15). */
  permissions: string;
  isActive: boolean;
  photoUri: string | null;
};

type SessionState = {
  /** Staff member currently using the app; null while locked / before login. */
  currentStaff: SessionStaff | null;
  currentStaffId: string | null;
  /** True on cold start and after `lock()`; the root layout shows the lock screen. */
  locked: boolean;
  /** Staff preselected on the lock screen (e.g. after "Switch user" → null = show all). */
  preferredStaffId: string | null;
  unlock: (staff: SessionStaff) => void;
  lock: (opts?: { switchUser?: boolean }) => void;
  setCurrentStaff: (staffId: string | null) => void;
};

// Login/logout audit entries are written by `src/features/auth/session.ts`, which wraps these.
export const useSessionStore = create<SessionState>((set, get) => ({
  currentStaff: null,
  currentStaffId: null,
  locked: true,
  preferredStaffId: null,
  unlock: (staff) => set({ currentStaff: staff, currentStaffId: staff.id, locked: false, preferredStaffId: staff.id }),
  lock: (opts) =>
    set({
      currentStaff: null,
      currentStaffId: null,
      locked: true,
      // Lock now → same person unlocks again; Switch user → show everyone.
      preferredStaffId: opts?.switchUser ? null : get().currentStaffId,
    }),
  setCurrentStaff: (currentStaffId) => set({ currentStaffId }),
}));

export const getCurrentStaffId = () => useSessionStore.getState().currentStaffId;
export const getCurrentStaff = () => useSessionStore.getState().currentStaff;
export const useCurrentStaff = () => useSessionStore((s) => s.currentStaff);
