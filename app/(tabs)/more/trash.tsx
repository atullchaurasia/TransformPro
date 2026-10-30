import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ActionSheet, AppText, Avatar, EmptyState, ErrorState, ListRow, SegmentedControl, SkeletonList } from '@/components';
import type { Member } from '@/db/models';
import { useCan } from '@/features/auth/permissions';
import { TRASH_RETENTION_DAYS, deleteMembersForever, loadTrashedMembers, restoreMember } from '@/features/members/memberActions';
import { resolvePhotoUri } from '@/services/photos';
import { useDataVersion } from '@/store/dataVersionStore';
import { confirm, toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';
import { logger } from '@/utils/logger';

// TODO(M08/M16/M17): add Payments, Enquiries and Expenses segments as those features land.
type TrashTab = 'members';

/** Trash (spec §10.2): restore, or delete permanently (owner only, type DELETE). */
export default function TrashScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { date_format, trash_auto_purge } = useSettings();
  const dataVersion = useDataVersion();
  const canRestore = useCan('members.delete');
  const canPurge = useCan('members.delete_permanent');
  const [tab, setTab] = useState<TrashTab>('members');
  const [members, setMembers] = useState<Member[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setMembers(await loadTrashedMembers());
    } catch (e) {
      logger.error('Loading trash failed', e);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const restore = async (m: Member) => {
    try {
      await restoreMember(m);
      toast.success(t('trash.restored', { name: m.fullName }));
    } catch (e) {
      logger.error('Restore failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  const purge = async (m: Member) => {
    const ok = await confirm({ title: t('trash.deleteTitle', { name: m.fullName }), message: t('trash.deleteMessage'), destructive: true, typedConfirmation: 'DELETE', confirmLabel: t('trash.deleteForever') });
    if (!ok) return;
    try {
      await deleteMembersForever([m], 'manual');
      toast.success(t('trash.deleted', { name: m.fullName }));
    } catch (e) {
      logger.error('Permanent delete failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  const body = () => {
    if (failed) return <ErrorState onRetry={load} />;
    if (!members) return <SkeletonList rows={4} />;
    if (members.length === 0) return <EmptyState icon="trash-outline" title={t('trash.emptyTitle')} message={t('trash.emptyMessage')} />;
    return (
      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 72 }} />}
        renderItem={({ item }) => (
          <ListRow
            title={item.fullName}
            subtitle={`${item.memberCode} · ${t('trash.deletedOn', { date: formatDate(item.deletedAt, date_format) })}`}
            left={<Avatar name={item.fullName} uri={resolvePhotoUri(item.photoUri)} size={40} />}
            onPress={
              canRestore || canPurge
                ? () => {
                    setActive(item);
                    setOpen(true);
                  }
                : undefined
            }
            showChevron={canRestore || canPurge}
          />
        )}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('more.items.trash'), headerLargeTitleEnabled: false }} />
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm }}>
        <SegmentedControl<TrashTab> value={tab} onChange={setTab} options={[{ value: 'members', label: t('tabs.members') }]} />
        <AppText variant="footnote" tone="secondary">
          {trash_auto_purge ? t('trash.autoPurgeOn', { days: TRASH_RETENTION_DAYS }) : t('trash.autoPurgeOff')}
        </AppText>
      </View>
      <View style={{ flex: 1, backgroundColor: colors.surface }}>{body()}</View>
      {/* The typed DELETE confirm opens only after this sheet has closed (iOS can't stack modals). */}
      <ActionSheet<'restore' | 'purge'>
        visible={open}
        onClose={() => setOpen(false)}
        title={active?.fullName}
        items={[
          ...(canRestore ? [{ key: 'restore' as const, label: t('trash.restore'), icon: 'arrow-undo' as const, color: colors.success }] : []),
          ...(canPurge ? [{ key: 'purge' as const, label: t('trash.deleteForever'), icon: 'trash' as const, destructive: true }] : []),
        ]}
        onSelect={(k) => {
          if (!active) return;
          void (k === 'restore' ? restore(active) : purge(active));
        }}
      />
    </View>
  );
}
