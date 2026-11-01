import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, Button, EmptyState, ErrorState, ListRow, SkeletonList } from '@/components';
import { isMemberBucket, type MemberBucket } from '@/domain/dashboard';
import type { MemberSummary } from '@/domain/memberList';
import { formatPaise } from '@/domain/money';
import { firstName } from '@/domain/templates';
import { useCan } from '@/features/auth/permissions';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { useMemberLabels } from '@/features/members/useMemberLabels';
import { openMember } from '@/features/members/useMemberRowActions';
import { openWhatsApp } from '@/services/messaging';
import { resolvePhotoUri } from '@/services/photos';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

/**
 * The members behind a dashboard card (§10.1). Uses the same `memberBuckets` result as the
 * card, so the list always matches the number that was tapped.
 */
export default function DashboardListScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { bucket: raw } = useLocalSearchParams<{ bucket: string }>();
  const bucket: MemberBucket = isMemberBucket(raw) ? raw : 'all';
  const d = useDashboard();
  const labels = useMemberLabels();
  const { currency_code, gym_name, expiring_soon_days } = useSettings();
  const canMessage = useCan('messages.send');
  const wishes = bucket === 'birthdays' || bucket === 'anniversaries';

  const sendWishes = async (m: MemberSummary) => {
    // TODO(M14): use the birthday / anniversary template.
    const key = bucket === 'birthdays' ? 'dashboard.wishes.birthday' : 'dashboard.wishes.anniversary';
    if ((await openWhatsApp(m.phone, t(key, { name: firstName(m.fullName), gym: gym_name }))) === 'unavailable') toast.error(t('members.cantWhatsApp'));
  };

  const detail = (m: MemberSummary & { daysAway?: number }) => {
    if (bucket === 'dues') return t('members.due', { amount: formatPaise(m.duePaise, currency_code) });
    if (bucket === 'absent' && m.daysAway != null) return t('checkin.absentees.daysAway', { count: m.daysAway });
    return [m.planName, labels.timing(m)].filter(Boolean).join(' · ');
  };

  const title = t(`dashboard.bucket.${bucket}`, { days: expiring_soon_days });
  const header = <Stack.Screen options={{ title, headerLargeTitleEnabled: false }} />;
  if (d.failed) return <>{header}<ErrorState onRetry={d.reload} /></>;
  if (!d.data) return <>{header}<View style={{ padding: spacing.lg }}><SkeletonList rows={6} /></View></>;
  const rows = d.data.buckets[bucket];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      <AppText variant="footnote" tone="secondary" style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
        {t('members.count', { count: rows.length })}
      </AppText>
      <FlashList
        data={rows}
        keyExtractor={(m) => m.id}
        onRefresh={() => void d.refresh()}
        refreshing={d.refreshing}
        ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title={t('dashboard.listEmpty')} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 72 }} />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface }}>
            <ListRow
              title={item.fullName}
              subtitle={`${item.memberCode} · ${detail(item)}`}
              left={<Avatar name={item.fullName} uri={resolvePhotoUri(item.photoUri)} size={40} />}
              right={wishes && canMessage ? <Button label={t('dashboard.wishes.send')} icon="logo-whatsapp" variant="secondary" size="sm" onPress={() => void sendWishes(item)} /> : undefined}
              showChevron={!wishes}
              onPress={() => openMember(item.id)}
            />
          </View>
        )}
      />
    </View>
  );
}
