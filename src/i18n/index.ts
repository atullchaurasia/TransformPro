import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { LanguageCode } from '@/store/preferencesStore';

import en from './en.json';
import hi from './hi.json';

// Adding a language = add `<code>.json` with the same keys and register it here (spec §11).
export const resources = {
  en: { translation: en },
  hi: { translation: hi },
} as const;

export const supportedLanguages: readonly LanguageCode[] = ['en', 'hi'];

export function deviceLanguage(): LanguageCode {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React already escapes
    returnNull: false,
  });
}

/** Switch language instantly, without restarting the app (spec §11). */
export function applyLanguage(language: LanguageCode): void {
  if (i18n.language !== language) void i18n.changeLanguage(language);
}

export { i18n };
