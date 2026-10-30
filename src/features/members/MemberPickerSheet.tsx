import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, BottomSheet, Input, ListRow } from '@/components';
import type { MemberListRow } from '@/domain/memberList';
import { formatPhone } from '@/domain/phones';
import { resolvePhotoUri } from '@/services/photos';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { quickSearchMembers } from './memberActions';
import { useDebounced } from './useMembersList';

export type MemberPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (m: MemberListRow) => void;
  title: string;
  excludeId?: string;
};

/** Search existing members by name, phone or code — "Referred by" (§10.2). */
export function MemberPickerSheet({ visible, onClose, onPick, title, excludeId }: MemberPickerSheetProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [q, setQ] = useState('');
  const query = useDebounced(q, 200);
  const [results, setResults] = useState<MemberListRow[]>([]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    quickSearchMembers(query)
      .then((r) => alive && setResults(r.filter((m) => m.id !== excludeId)))
      .catch((e: unknown) => logger.error('Member search failed', e));
    return () => {
      alive = false;
    };
  }, [query, visible, excludeId]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={{ gap: spacing.md, minHeight: 360 }}>
        <Input value={q} onChangeText={setQ} placeholder={t('members.searchPlaceholder')} clearable autoFocus autoCorrect={false} />
        <FlatList
          data={results}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          style={{ marginHorizontal: -spacing.lg }}
          ListEmptyComponent={
            <AppText tone="secondary" align="center" style={{ padding: spacing.lg }}>
              {t('common.noResults')}
            </AppText>
          }
          renderItem={({ item }) => (
            <ListRow
              title={item.fullName}
              subtitle={`${item.memberCode} · ${formatPhone(item.phone)}`}
              left={<Avatar name={item.fullName} uri={resolvePhotoUri(item.photoUri)} size={36} />}
              onPress={() => {
                onPick(item);
                onClose();
              }}
            />
          )}
        />
      </View>
    </BottomSheet>
  );
}
