import { FlashList } from '@shopify/flash-list';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, Input, ListRow } from '@/components';
import type { MemberListRow } from '@/domain/memberList';
import { formatPhone } from '@/domain/phones';
import { quickSearchMembers } from '@/features/members/memberActions';
import { useDebounced } from '@/features/members/useMembersList';
import { resolvePhotoUri } from '@/services/photos';
import { useDataVersion } from '@/store/dataVersionStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { loadRecentVisitors } from './checkinActions';
import { CheckinResultCard } from './CheckinResultCard';
import { resultKey } from './ScannerView';
import type { CheckinFlow } from './useCheckinFlow';

/** Search & mark (§10.4): search box + recent members → check in / check out. */
export function SearchMarkView({ flow }: { flow: CheckinFlow }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const dataVersion = useDataVersion();
  const [q, setQ] = useState('');
  const query = useDebounced(q, 200);
  const [rows, setRows] = useState<MemberListRow[]>([]);

  useEffect(() => {
    let alive = true;
    (query.trim() ? quickSearchMembers(query) : loadRecentVisitors())
      .then((r) => alive && setRows(r))
      .catch((e: unknown) => logger.error('Check-in search failed', e));
    return () => {
      alive = false;
    };
  }, [query, dataVersion]);

  return (
    <View style={{ flex: 1, gap: spacing.md }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <Input value={q} onChangeText={setQ} placeholder={t('members.searchPlaceholder')} clearable autoCorrect={false} />
        {flow.result ? <CheckinResultCard key={resultKey(flow)} result={flow.result} flow={flow} method="search" /> : null}
        {!query.trim() ? (
          <AppText variant="footnote" tone="secondary" weight="600">
            {t('checkin.recent').toUpperCase()}
          </AppText>
        ) : null}
      </View>
      <FlashList
        data={rows}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<AppText tone="secondary" align="center" style={{ padding: spacing.lg }}>{query.trim() ? t('common.noResults') : t('checkin.noRecent')}</AppText>}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 72 }} />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface }}>
            <ListRow
              title={item.fullName}
              subtitle={`${item.memberCode} · ${formatPhone(item.phone)}`}
              left={<Avatar name={item.fullName} uri={resolvePhotoUri(item.photoUri)} size={40} />}
              value={t('checkin.mark')}
              valueTone="brand"
              onPress={() => void flow.processMember(item.id, 'search')}
            />
          </View>
        )}
      />
    </View>
  );
}
