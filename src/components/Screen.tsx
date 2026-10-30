import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { EmptyState } from './States';

export type ScreenScrollProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Extra bottom padding, e.g. to clear a FAB. */
  bottomInset?: number;
};

/**
 * Scrollable screen body. `contentInsetAdjustmentBehavior="automatic"` lets the native
 * large-title header collapse on scroll, like iOS Settings (spec §12).
 */
export function ScreenScroll({ children, contentStyle, onRefresh, refreshing = false, bottomInset = 0 }: ScreenScrollProps) {
  const { colors, spacing } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[{ paddingTop: spacing.md, paddingBottom: spacing.xxl + bottomInset }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

/**
 * Form screen: the ScrollView moves inputs above the keyboard automatically
 * (`automaticallyAdjustKeyboardInsets`) and taps on buttons work while it's open (spec §12).
 */
export function FormScreen({ children, contentStyle }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  const { colors, spacing } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={[{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 }, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}

/** Placeholder for screens and actions owned by a later milestone (roadmap Wire-up register). */
export function ComingSoon({ milestone, title }: { milestone: string; title?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <EmptyState icon="construct-outline" title={title ?? t('common.comingSoon')} message={t('common.comingSoonIn', { milestone })} />
    </View>
  );
}

export function PlaceholderNote({ text }: { text: string }) {
  const { spacing } = useTheme();
  return (
    <AppText variant="subhead" tone="secondary" align="center" style={{ padding: spacing.xl }}>
      {text}
    </AppText>
  );
}
