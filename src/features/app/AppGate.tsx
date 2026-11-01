import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { ErrorState } from '@/components';
import { loadOwner, signIn } from '@/features/auth/session';
import { useAutoLock } from '@/features/auth/useAutoLock';
import { autoCheckoutSafely } from '@/features/checkin/checkinActions';
import { purgeOldTrash } from '@/features/members/memberActions';
import { purgeOldPaymentTrash } from '@/features/payments/paymentActions';
import { closeFinishedFreezesSafely } from '@/features/profile/profileActions';
import { deviceLanguage } from '@/i18n';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

/**
 * Runs once the database is open: loads settings into the cache, then decides the start
 * state. Before onboarding the device language is used; with the lock switched off the
 * owner is signed in automatically. The lock itself is shown by the route guards.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [failed, setFailed] = useState(false);
  useAutoLock();

  const start = useCallback(async () => {
    try {
      setFailed(false);
      await useSettingsStore.getState().hydrate();
      const { settings } = useSettingsStore.getState();
      if (!settings.onboarding_complete) {
        usePreferencesStore.getState().setLanguage(deviceLanguage());
        return;
      }
      // TODO(M11): full start-up pipeline in §13 order (daily auto-backup, notifications), each
      // step isolated. Already here and never throwing: auto check-out (M09), trash auto-purge
      // (M06/M08) and ending fixed freezes whose last day has passed (M07, §6.4).
      void autoCheckoutSafely();
      void purgeOldTrash();
      void purgeOldPaymentTrash();
      void closeFinishedFreezesSafely();
      if (!settings.lock_enabled) {
        const owner = await loadOwner();
        if (owner) await signIn(owner, 'no_lock');
      }
    } catch (e) {
      logger.error('App start failed', e);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void start();
  }, [start]);

  if (failed) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ErrorState onRetry={start} />
      </View>
    );
  }
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return children;
}
