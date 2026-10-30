import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, Button, EmptyState, Input, ListRow, SectionHeader } from '@/components';
import type { MemberListRow } from '@/domain/memberList';
import { memberScope } from '@/domain/permissions';
import { formatPhone } from '@/domain/phones';
import { quickSearchMembers } from '@/features/members/memberActions';
import { openMember } from '@/features/members/useMemberRowActions';
import { useDebounced } from '@/features/members/useMembersList';
import { resolvePhotoUri } from '@/services/photos';
import { useCurrentStaff } from '@/store/sessionStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

/** Global search (spec §9): members by name, phone or code. TODO(M16): enquiries section. */
export default function SearchScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const staff = useCurrentStaff();
  const [q, setQ] = useState('');
  const query = useDebounced(q, 200);
  const [members, setMembers] = useState<MemberListRow[]>([]);

  useEffect(() => {
    if (!query.trim()) return setMembers([]);
    let alive = true;
    quickSearchMembers(query)
      .then((rows) => {
        if (!alive) return;
        // Trainers without "view all" only find their assigned members (§10.13).
        setMembers(memberScope(staff) === 'assigned' ? rows.filter((m) => m.assignedTrainerId === staff?.id) : rows);
      })
      .catch((e: unknown) => logger.error('Search failed', e));
    return () => {
      alive = false;
    };
  }, [query, staff]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('common.search'), headerRight: () => <Button label={t('common.done')} variant="ghost" size="sm" onPress={() => router.back()} /> }} />
      <View style={{ padding: spacing.lg }}>
        <Input value={q} onChangeText={setQ} placeholder={t('search.placeholder')} clearable autoFocus autoCorrect={false} returnKeyType="search" />
      </View>
      {!query.trim() ? (
        <AppText tone="secondary" align="center" style={{ padding: spacing.xl }}>
          {t('search.hint')}
        </AppText>
      ) : members.length === 0 ? (
        <EmptyState icon="search" title={t('common.noResults')} message={t('search.nothing', { q: query })} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={<SectionHeader title={t('tabs.members')} />}
          renderItem={({ item }) => (
            <ListRow
              title={item.fullName}
              subtitle={`${item.memberCode} · ${formatPhone(item.phone)}`}
              left={<Avatar name={item.fullName} uri={resolvePhotoUri(item.photoUri)} size={40} />}
              onPress={() => {
                router.back();
                openMember(item.id);
              }}
              showChevron
            />
          )}
        />
      )}
    </View>
  );
}
