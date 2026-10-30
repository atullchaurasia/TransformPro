import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FAB, PlaceholderNote, ScreenScroll } from '@/components';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { HeaderIconButton } from '@/features/navigation/HeaderIconButton';
import { QuickActionsSheet } from '@/features/navigation/QuickActionsSheet';
import { useTheme } from '@/theme';

// TODO(M10): dashboard cards, attention list, charts, backup banner.
export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              {/* TODO(M06): global search */}
              <HeaderIconButton icon="search" accessibilityLabel={t('a11y.search')} onPress={() => openComingSoon('M06', t('common.search'))} />
              {/* TODO(M04): lock now */}
              <HeaderIconButton icon="lock-closed-outline" accessibilityLabel={t('a11y.lock')} onPress={() => openComingSoon('M04', t('more.items.lockNow'))} />
            </View>
          ),
        }}
      />
      <ScreenScroll bottomInset={80}>
        <PlaceholderNote text={t('placeholders.home')} />
      </ScreenScroll>
      <FAB accessibilityLabel={t('a11y.quickActions')} onPress={() => setQuickActionsOpen(true)} />
      <QuickActionsSheet visible={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
    </View>
  );
}
