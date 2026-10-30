import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { shouldRelock } from '@/domain/lockout';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';

import { autoLock } from './session';

/** Relocks after the app has been in the background longer than `lock_after_minutes` (§8). */
export function useAutoLock(): void {
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state !== 'active') return;
      const { lock_enabled, lock_after_minutes } = useSettingsStore.getState().settings;
      const { locked } = useSessionStore.getState();
      if (lock_enabled && !locked && shouldRelock(backgroundedAt.current, Date.now(), lock_after_minutes)) autoLock();
      backgroundedAt.current = null;
    });
    return () => sub.remove();
  }, []);
}
