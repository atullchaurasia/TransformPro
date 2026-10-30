import '@/i18n';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FeedbackHost } from '@/components';
import { DatabaseGate } from '@/features/app/DatabaseGate';
import { applyLanguage, deviceLanguage } from '@/i18n';
import { usePreferencesStore } from '@/store/preferencesStore';
import { ThemeProvider, useTheme } from '@/theme';

/** Keeps i18next in step with the language preference — switching is instant (spec §11). */
function LanguageSync() {
  const language = usePreferencesStore((s) => s.language);
  useEffect(() => applyLanguage(language), [language]);
  return null;
}

/** Feeds our theme tokens into React Navigation (headers, tab bar, backgrounds). */
function NavigationTheme({ children }: { children: ReactNode }) {
  const { scheme, colors } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <NavigationThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.separator,
          notification: colors.danger,
        },
      }}
    >
      {children}
    </NavigationThemeProvider>
  );
}

function RootStack() {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="coming-soon" options={{ title: t('common.comingSoon') }} />
        <Stack.Screen name="dev/ui-kit" options={{ title: t('uiKit.title') }} />
        <Stack.Screen name="dev/db" options={{ title: t('devDb.title') }} />
      </Stack>
      <FeedbackHost />
    </>
  );
}

// Provider stack. M04 adds the onboarding/lock gate inside DatabaseGate.
export default function RootLayout() {
  useEffect(() => {
    // TODO(M04): replace with the language saved in settings / chosen during onboarding.
    usePreferencesStore.getState().setLanguage(deviceLanguage());
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageSync />
        <NavigationTheme>
          <DatabaseGate>
            <RootStack />
          </DatabaseGate>
        </NavigationTheme>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
