import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Native stack inside a tab, with iOS large titles that collapse on scroll (spec §12). */
export function TabStack({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerLargeStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
