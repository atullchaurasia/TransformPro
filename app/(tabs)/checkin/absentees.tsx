import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, Button, EmptyState, ErrorState, ListRow, SegmentedControl, SkeletonList } from '@/components';
import { ABSENT_DAYS, type Absentee } from '@/domain/attendance';
import type { MemberSummary } from '@/domain/memberList';
import { useCan } from '@/features/auth/permissions';
import { loadAbsentees } from '@/features/checkin/checkinActions';
import { openMember } from '@/features/members/useMemberRowActions';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { resolvePhotoUri } from '@/services/photos';
import { useDataVersion } from '@/store/dataVersionStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';
import { logger } from '@/utils/logger';

type Days = `${(typeof ABSENT_DAYS)[number]}`;

/** Absentees (§10.4): active members not seen for 7 / 14 / 30 days → bulk message (M14). */
export default function AbsenteesScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { date_format } = useSettings();
  const dataVersion = useDataVersion();
  const canMessage = useCan('messages.send');
  const [days, setDays] = useState<Days>('7');
  const [rows, setRows] = useState<Absentee<MemberSummary>[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setRows(await loadAbsentees(Number(days)));
    } catch (e) {
      logger.error('Loading absentees failed', e);
      setFailed(true);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const body = () => {
    if (failed) return <ErrorState onRetry={load} />;
    if (!rows) return <SkeletonList rows={6} />;
    return (
      <FlashList
        data={rows}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={<EmptyState icon="happy-outline" title={t('checkin.absentees.emptyTitle')} message={t('checkin.absentees.emptyMessage', { count: Number(days) })} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 72 }} />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface }}>
            <ListRow
              title={item.fullName}
              subtitle={item.lastVisit ? t('checkin.absentees.lastVisit', { date: formatDate(item.lastVisit, date_format) }) : t('checkin.absentees.never')}
              left={<Avatar name={item.fullName} uri={resolvePhotoUri(item.photoUri)} size={40} />}
              value={t('checkin.absentees.daysAway', { count: item.daysAway })}
              valueTone="danger"
              onPress={() => openMember(item.id)}
            />
          </View>
        )}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, gap: spacing.sm, paddingTop: spacing.sm }}>
      <Stack.Screen options={{ title: t('checkin.absentees.title'), headerLargeTitleEnabled: false }} />
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        <SegmentedControl<Days> value={days} onChange={setDays} options={ABSENT_DAYS.map((d) => ({ value: `${d}` as Days, label: t('checkin.absentees.days', { count: d }) }))} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="subhead" tone="secondary">
            {t('members.count', { count: rows?.length ?? 0 })}
          </AppText>
          {/* TODO(M14): bulk "We miss you" message to everyone listed (send queue). */}
          {canMessage && rows && rows.length > 0 ? (
            <Button label={t('checkin.absentees.message')} icon="chatbubbles-outline" variant="ghost" size="sm" onPress={() => openComingSoon('M14', t('checkin.absentees.message'))} />
          ) : null}
        </View>
      </View>
      <View style={{ flex: 1 }}>{body()}</View>
    </View>
  );
}
