import { create } from 'zustand';

type SessionState = {
  /** Staff member currently using the app; null before login. */
  currentStaffId: string | null;
  setCurrentStaff: (staffId: string | null) => void;
};

// TODO(M04): add role/permissions, lock state and login/logout (audit-logged).
export const useSessionStore = create<SessionState>((set) => ({
  currentStaffId: null,
  setCurrentStaff: (currentStaffId) => set({ currentStaffId }),
}));

export const getCurrentStaffId = () => useSessionStore.getState().currentStaffId;
