import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguageCode = 'en' | 'hi';

type PreferencesState = {
  theme: ThemePreference;
  language: LanguageCode;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: LanguageCode) => void;
};

// In-memory for now. TODO(M04): hydrate from and persist to the `settings` table
// (`theme`, `language` keys) once the settings repository exists.
export const usePreferencesStore = create<PreferencesState>((set) => ({
  theme: 'system',
  language: 'en',
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
}));
