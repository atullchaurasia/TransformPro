import '@/i18n';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FeedbackHost } from '@/components';
import { AppGate } from '@/features/app/AppGate';
import { DatabaseGate } from '@/features/app/DatabaseGate';
import { applyLanguage } from '@/i18n';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
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

/**
 * Route guards (spec §7–8): onboarding until it's complete, then the lock screen until a
 * staff member unlocks. Leaving a guard (e.g. auto-lock) redirects automatically.
 */
function RootStack() {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const onboarded = useSettingsStore((s) => s.settings.onboarding_complete);
  const locked = useSessionStore((s) => s.locked);
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding/index" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded && locked}>
          <Stack.Screen name="lock" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded && !locked}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="plans/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="member/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="member/[id]/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="member/[id]/renew" options={{ presentation: 'modal' }} />
          <Stack.Screen name="member/[id]/subscription" options={{ presentation: 'modal' }} />
          <Stack.Screen name="payment/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="payment/refund" options={{ presentation: 'modal' }} />
          <Stack.Screen name="backup/index" options={{ title: t('backup.title') }} />
          <Stack.Screen name="export/index" options={{ title: t('export.title') }} />
          <Stack.Screen name="import/index" options={{ title: t('import.title') }} />
          <Stack.Screen name="search" options={{ presentation: 'modal' }} />
          <Stack.Screen name="dev/ui-kit" options={{ title: t('uiKit.title') }} />
          <Stack.Screen name="dev/db" options={{ title: t('devDb.title') }} />
        </Stack.Protected>
        {/* Reachable from onboarding too. Restore asks for the owner's PIN whenever an owner exists. */}
        <Stack.Screen name="coming-soon" options={{ title: t('common.comingSoon') }} />
        <Stack.Screen name="backup/restore" options={{ presentation: 'modal' }} />
      </Stack>
      <FeedbackHost />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageSync />
        <NavigationTheme>
          <DatabaseGate>
            <AppGate>
              <RootStack />
            </AppGate>
          </DatabaseGate>
        </NavigationTheme>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
