import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, EmptyState, ErrorState, SkeletonList } from '@/components';
import type { MemberAuditEntry } from '@/db/repositories/memberProfile';
import { useCan } from '@/features/auth/permissions';
import { loadMemberHistory } from '@/features/profile/profileActions';
import { useDataVersion } from '@/store/dataVersionStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { formatDateTime } from '@/utils/format';
import { logger } from '@/utils/logger';

/** Audit history for one member — every change to them, their plans and payments (§10.2 More menu). */
export default function MemberHistoryScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { date_format, language } = useSettings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCan('audit.view');
  const dataVersion = useDataVersion();
  const [entries, setEntries] = useState<MemberAuditEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setEntries(await loadMemberHistory(id));
    } catch (e) {
      logger.error('Loading member history failed', e);
      setFailed(true);
    }
  }, [id]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load, dataVersion]);

  const header = <Stack.Screen options={{ title: t('profile.history.title'), headerLargeTitleEnabled: false }} />;
  if (!allowed) return <>{header}<ErrorState message={t('auth.noPermission')} /></>;
  if (failed) return <>{header}<ErrorState onRetry={load} /></>;
  if (!entries) return <>{header}<View style={{ padding: spacing.lg }}><SkeletonList rows={8} /></View></>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      {entries.length === 0 ? (
        <EmptyState icon="time-outline" title={t('profile.history.emptyTitle')} message={t('profile.history.emptyMessage')} />
      ) : (
        <FlashList
          data={entries}
          keyExtractor={(e) => e.id}
          contentInsetAdjustmentBehavior="automatic"
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: spacing.lg }} />}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 2, backgroundColor: colors.surface }}>
              <AppText variant="body">{item.summary}</AppText>
              <AppText variant="footnote" tone="secondary">
                {[formatDateTime(item.createdAt, date_format, language), item.staffName ?? t('profile.history.system')].join(' · ')}
              </AppText>
            </View>
          )}
        />
      )}
    </View>
  );
}
