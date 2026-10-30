import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export type EmptyStateProps = {
  icon?: IconName;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Every list's empty state: icon + message + action (spec §12). */
export function EmptyState({ icon = 'file-tray-outline', title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.center, { padding: spacing.xl, gap: spacing.sm }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={36} color={colors.primary} />
      </View>
      <AppText variant="title3" align="center">
        {title ?? t('states.emptyTitle')}
      </AppText>
      {message ? (
        <AppText variant="subhead" tone="secondary" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} icon="add" onPress={onAction} style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}

export type ErrorStateProps = { message?: string; onRetry?: () => void };

/** Every list's error state with retry (spec §12). */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.center, { padding: spacing.xl, gap: spacing.sm }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerSoft }]}>
        <Icon name="alert-circle-outline" size={36} color={colors.danger} />
      </View>
      <AppText variant="title3" align="center">
        {t('states.errorTitle')}
      </AppText>
      <AppText variant="subhead" tone="secondary" align="center">
        {message ?? t('states.errorMessage')}
      </AppText>
      {onRetry ? <Button label={t('common.retry')} icon="refresh" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export type SkeletonProps = { width?: DimensionValue; height?: number; radius?: number };

export function Skeleton({ width = '100%', height = 16, radius = 6 }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={{ width, height, borderRadius: radius, backgroundColor: colors.skeleton, opacity }} />;
}

/** Loading placeholder shaped like list rows (avatar + two lines). */
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  const { spacing } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.lg }} accessibilityLabel={t('common.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton width={44} height={44} radius={22} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton width="60%" />
            <Skeleton width="35%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
