import { useCallback, useEffect, useRef, useState } from 'react';

import type { CheckinMethod } from '@/db/models';
import { shouldIgnoreScan } from '@/domain/attendance';
import { checkinFeedback } from '@/services/checkinFeedback';
import { useSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

import { performCheckin, performCheckout, prepareCheckin, prepareCheckinFromQr, type CheckinCheck } from './checkinActions';

export type CheckinResult =
  | { kind: 'checked_in'; check: CheckinCheck; at: string; overridden: boolean }
  | { kind: 'checked_out'; check: CheckinCheck; at: string }
  /** Already inside today → offer Check out (§6.8). */
  | { kind: 'inside'; check: CheckinCheck }
  | { kind: 'blocked'; check: CheckinCheck }
  | { kind: 'error'; reason: 'not_ours' | 'unknown_member' | 'failed' };

/**
 * Green/orange results (and "not found") disappear after 2 s and scanning resumes (§10.4).
 * Red results stay until handled — they carry Renew / Override.
 */
const AUTO_HIDE_MS = 2000;
const KIOSK_HIDE_MS = 6000;

/** The check-in state machine shared by Scan QR and Search & mark (§10.4, §6.8). */
export function useCheckinFlow({ kiosk = false }: { kiosk?: boolean } = {}) {
  const { checkin_sound } = useSettings();
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [busy, setBusy] = useState(false);
  const lastScans = useRef(new Map<string, number>());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };

  const show = useCallback(
    (r: CheckinResult) => {
      clearTimer();
      setResult(r);
      const warned = r.kind === 'checked_in' && r.check.decision.kind === 'check_in' && r.check.decision.warnings.length > 0;
      void checkinFeedback(r.kind === 'blocked' || r.kind === 'error' ? 'blocked' : warned || r.kind === 'inside' ? 'warning' : 'ok', checkin_sound);
      if (r.kind === 'checked_in' || r.kind === 'checked_out' || r.kind === 'error') hideTimer.current = setTimeout(() => setResult(null), AUTO_HIDE_MS);
      // An unattended kiosk can't get stuck on a red card or an "Already inside" prompt.
      else if (kiosk) hideTimer.current = setTimeout(() => setResult(null), KIOSK_HIDE_MS);
    },
    [checkin_sound, kiosk],
  );

  useEffect(() => clearTimer, []);

  const act = useCallback(
    async (check: CheckinCheck | null, method: CheckinMethod) => {
      if (!check) return show({ kind: 'error', reason: 'unknown_member' });
      const d = check.decision;
      if (d.kind === 'check_out') return show({ kind: 'inside', check });
      if (d.kind === 'blocked') return show({ kind: 'blocked', check });
      const visit = await performCheckin(check, method);
      show({ kind: 'checked_in', check, at: visit.checkInAt, overridden: false });
    },
    [show],
  );

  const run = useCallback(
    async (task: () => Promise<void>) => {
      setBusy(true);
      try {
        await task();
      } catch (e) {
        logger.error('Check-in failed', e);
        show({ kind: 'error', reason: 'failed' });
      } finally {
        setBusy(false);
      }
    },
    [show],
  );

  return {
    result,
    busy,
    /** Search & mark, swipe, profile. */
    processMember: (memberId: string, method: CheckinMethod = 'search') => run(async () => act(await prepareCheckin(memberId), method)),
    /** Scan QR; the same code is ignored for 5 s. Returns false when ignored. */
    processQr: (payload: string): boolean => {
      const now = Date.now();
      if (busy || result || shouldIgnoreScan(lastScans.current, payload, now)) return false;
      lastScans.current.set(payload, now);
      void run(async () => {
        const lookup = await prepareCheckinFromQr(payload);
        if (!lookup.ok) return show({ kind: 'error', reason: lookup.reason });
        await act(lookup.check, 'qr');
      });
      return true;
    },
    /** Owner/manager lets a blocked member in with a reason (audit-logged, §6.8). */
    override: (reason: string, method: CheckinMethod) =>
      run(async () => {
        if (result?.kind !== 'blocked') return;
        const visit = await performCheckin(result.check, method, reason);
        show({ kind: 'checked_in', check: result.check, at: visit.checkInAt, overridden: true });
      }),
    checkOut: () =>
      run(async () => {
        if (result?.kind !== 'inside' || !result.check.openVisit) return;
        await performCheckout(result.check.openVisit);
        show({ kind: 'checked_out', check: result.check, at: new Date().toISOString() });
      }),
    dismiss: () => {
      clearTimer();
      setResult(null);
    },
  };
}

export type CheckinFlow = ReturnType<typeof useCheckinFlow>;
