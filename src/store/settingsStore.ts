import { create } from 'zustand';

import { getDb, writeTransaction } from '@/db/client';
import { writeAudit } from '@/db/repositories';
import { loadSettings, saveSettings } from '@/db/repositories/settings';
import { SETTINGS_DEFAULTS, type AppSettings } from '@/domain/settings';
import { readLockSettings, writeLockSettings } from '@/services/secureStore';

import { usePreferencesStore } from './preferencesStore';

type SettingsState = {
  /** Cache of the `settings` table — the DB stays the source of truth (CLAUDE.md §1). */
  settings: AppSettings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Validates, saves in one transaction with an audit entry, then refreshes the cache. */
  update: (patch: Partial<AppSettings>, summary?: string) => Promise<void>;
};

const LOCK_KEYS = ['lock_enabled', 'lock_after_minutes', 'biometric_enabled'] as const;

function syncPreferences(s: AppSettings) {
  const prefs = usePreferencesStore.getState();
  if (prefs.theme !== s.theme) prefs.setTheme(s.theme);
  if (prefs.language !== s.language) prefs.setLanguage(s.language);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: SETTINGS_DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    const settings = await loadSettings(getDb());
    // Lock settings are kept in the Keychain too (§1); the Keychain copy wins if present so
    // a restored backup can't silently switch the lock off on this device.
    const lock = await readLockSettings();
    const merged: AppSettings = lock
      ? { ...settings, lock_enabled: lock.lockEnabled, lock_after_minutes: lock.lockAfterMinutes, biometric_enabled: lock.biometricEnabled }
      : settings;
    set({ settings: merged, hydrated: true });
    syncPreferences(merged);
  },

  update: async (patch, summary) => {
    const keys = Object.keys(patch);
    if (keys.length === 0) return;
    await writeTransaction(async (tx) => {
      await saveSettings(tx, patch);
      await writeAudit(tx, { action: 'settings.update', entity: 'settings', summary: summary ?? `Changed ${keys.join(', ')}` });
    });
    const settings = { ...get().settings, ...patch };
    set({ settings });
    if (LOCK_KEYS.some((k) => k in patch)) {
      await writeLockSettings({
        lockEnabled: settings.lock_enabled,
        lockAfterMinutes: settings.lock_after_minutes,
        biometricEnabled: settings.biometric_enabled,
      });
    }
    syncPreferences(settings);
  },
}));

export const getSettings = () => useSettingsStore.getState().settings;
export const useSettings = () => useSettingsStore((s) => s.settings);
