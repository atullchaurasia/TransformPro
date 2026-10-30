import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';
export type ToastItem = { id: number; kind: ToastKind; message: string };

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Permanent actions require typing this word, e.g. "DELETE", "RESTORE", "ERASE" (spec §12). */
  typedConfirmation?: string;
};

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

type FeedbackState = {
  toasts: ToastItem[];
  pendingConfirm: PendingConfirm | null;
  pushToast: (kind: ToastKind, message: string) => void;
  dismissToast: (id: number) => void;
  openConfirm: (request: PendingConfirm) => void;
  settleConfirm: (ok: boolean) => void;
};

let nextToastId = 1;

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  toasts: [],
  pendingConfirm: null,
  pushToast: (kind, message) =>
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id: nextToastId++, kind, message }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  openConfirm: (request) => {
    // Only one dialog at a time: a newer request cancels the older one.
    get().pendingConfirm?.resolve(false);
    set({ pendingConfirm: request });
  },
  settleConfirm: (ok) => {
    get().pendingConfirm?.resolve(ok);
    set({ pendingConfirm: null });
  },
}));

/** Snackbar feedback, e.g. toast.success('Payment of ₹2,000 recorded') (spec §12). */
export const toast = {
  success: (message: string) => useFeedbackStore.getState().pushToast('success', message),
  error: (message: string) => useFeedbackStore.getState().pushToast('error', message),
  info: (message: string) => useFeedbackStore.getState().pushToast('info', message),
};

/** Promise-based confirmation dialog: `if (await confirm({...})) { ... }`. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => useFeedbackStore.getState().openConfirm({ ...options, resolve }));
}
