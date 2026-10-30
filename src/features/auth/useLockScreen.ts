import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Staff } from '@/db/models';
import { attemptsLeft, cooldownRemaining, INITIAL_LOCKOUT, type LockoutState } from '@/domain/lockout';
import { authenticateBiometric, biometricsAvailable } from '@/services/auth';
import { readLockout } from '@/services/secureStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

import { attemptPin, loadLoginStaff, signIn } from './session';

/** State + actions for the lock screen (§8). The screen itself only renders. */
export function useLockScreen() {
  const { t } = useTranslation();
  const preferredStaffId = useSessionStore((s) => s.preferredStaffId);
  const biometricEnabled = useSettingsStore((s) => s.settings.biometric_enabled);
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<Staff | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lockout, setLockout] = useState<LockoutState>(INITIAL_LOCKOUT);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [canBiometric, setCanBiometric] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
      const [list, lock] = await Promise.all([loadLoginStaff(), readLockout()]);
      setStaff(list);
      setLockout(lock);
      // One person (or the last user after "Lock now") → straight to their keypad.
      const preferred = list.find((s) => s.id === preferredStaffId) ?? (list.length === 1 ? list[0] : undefined);
      setSelected(preferred ?? null);
    } catch (e) {
      logger.error('Lock screen load failed', e);
      setLoadFailed(true);
    }
  }, [preferredStaffId]);

  useEffect(() => {
    void load();
    void biometricsAvailable().then(setCanBiometric);
  }, [load]);

  const remainingMs = cooldownRemaining(lockout, now);
  useEffect(() => {
    if (remainingMs <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [remainingMs]);

  const biometricOffered = biometricEnabled && canBiometric && selected?.role === 'owner';

  const unlockWithBiometric = useCallback(async () => {
    if (!selected || selected.role !== 'owner') return;
    const result = await authenticateBiometric(t('lock.biometricPrompt'), t('common.cancel'));
    if (result === 'success') {
      try {
        await signIn(selected, 'biometric');
      } catch (e) {
        logger.error('Biometric sign-in failed', e);
        setError(t('common.somethingWentWrong'));
      }
    } else if (result === 'failed') setError(t('lock.biometricFailed'));
    else if (result === 'unavailable') setError(t('lock.biometricUnavailable'));
  }, [selected, t]);

  // Offer Face ID as soon as the owner's keypad appears.
  useEffect(() => {
    if (biometricOffered) void unlockWithBiometric();
  }, [biometricOffered, unlockWithBiometric]);

  const submit = useCallback(
    async (value: string) => {
      if (!selected || busy) return;
      setBusy(true);
      try {
        const result = await attemptPin(selected, value);
        if (result.ok) return;
        setLockout(result.lockout);
        setNow(Date.now());
        setPin('');
        setError(result.reason === 'cooldown' ? null : t('lock.wrongPin', { count: attemptsLeft(result.lockout) }));
      } catch (e) {
        logger.error('PIN check failed', e);
        setError(t('common.somethingWentWrong'));
      } finally {
        setBusy(false);
      }
    },
    [selected, busy, t],
  );

  const choose = (s: Staff | null) => {
    setSelected(s);
    setPin('');
    setError(null);
  };

  return {
    staff,
    loadFailed,
    reload: load,
    selected,
    choose,
    pin,
    setPin: (v: string) => {
      setError(null);
      setPin(v);
    },
    submit,
    error,
    busy,
    cooldownSeconds: Math.ceil(remainingMs / 1000),
    biometricOffered,
    unlockWithBiometric,
  };
}
