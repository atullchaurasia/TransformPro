import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguageCode = 'en' | 'hi';

type PreferencesState = {
  theme: ThemePreference;
  language: LanguageCode;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: LanguageCode) => void;
};

// What the UI renders with right now. Persisted values live in the `settings` table:
// settingsStore.hydrate/update push `theme` and `language` here. Before onboarding is
// finished (no settings yet) the Welcome step sets the language directly.
export const usePreferencesStore = create<PreferencesState>((set) => ({
  theme: 'system',
  language: 'en',
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
}));
