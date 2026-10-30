import { FlashList } from '@shopify/flash-list';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, ChoiceSheet, EmptyState, ErrorState, SkeletonList } from '@/components';
import { memberScope } from '@/domain/permissions';
import type { MemberSort } from '@/domain/memberList';
import { useCan } from '@/features/auth/permissions';
import { BulkBar, type BulkAction } from '@/features/members/BulkBar';
import { FilterBar } from '@/features/members/FilterBar';
import { FiltersSheet } from '@/features/members/FiltersSheet';
import { MemberRow } from '@/features/members/MemberRow';
import { TrainerSheet } from '@/features/members/StaffPickerSheet';
import { assignTrainer, moveMembersToTrash } from '@/features/members/memberActions';
import { useMemberLookups } from '@/features/members/useMemberLookups';
import { openMember, useMemberRowActions } from '@/features/members/useMemberRowActions';
import { useMembersList } from '@/features/members/useMembersList';
import { HeaderIconButton } from '@/features/navigation/HeaderIconButton';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { confirm, toast } from '@/store/feedbackStore';
import { useCurrentStaff } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

const SORTS: MemberSort[] = ['name', 'newest', 'expiry', 'due', 'lastVisit'];

/** Members list (spec §10.2). */
export default function MembersScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code } = useSettings();
  const staff = useCurrentStaff();
  const list = useMembersList();
  const lookups = useMemberLookups();
  const onAction = useMemberRowActions();
  const [sheet, setSheet] = useState<'filters' | 'sort' | 'trainer' | null>(null);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const can = { create: useCan('members.create'), edit: useCan('members.edit'), del: useCan('members.delete'), export: useCan('members.export') };

  // Trainers without `members.view_all` see only their own members (§10.13).
  const members = useMemo(() => {
    if (!list.members || memberScope(staff) !== 'assigned') return list.members;
    return list.members.filter((m) => m.trainerId === staff?.id || m.assignedTrainerId === staff?.id);
  }, [list.members, staff]);

  const selecting = selected !== null;
  const chosen = useMemo(() => (members ?? []).filter((m) => selected?.has(m.id)), [members, selected]);
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulkActions: BulkAction[] = [
    'message',
    ...(can.export ? (['export'] as const) : []),
    ...(can.edit ? (['trainer'] as const) : []),
    ...(can.edit && lookups.branches.length > 1 ? (['branch'] as const) : []),
    ...(can.del ? (['trash'] as const) : []),
  ];

  const onBulk = async (a: BulkAction) => {
    if (chosen.length === 0) return toast.info(t('members.bulk.pickFirst'));
    if (a === 'message') return openComingSoon('M14', t('members.bulk.message')); // TODO(M14): send queue
    if (a === 'export') return openComingSoon('M11', t('members.bulk.export')); // TODO(M11): export selected
    if (a === 'branch') return openComingSoon('M19', t('members.bulk.branch')); // TODO(M19): change branch
    if (a === 'trainer') return setSheet('trainer');
    if (await confirm({ title: t('members.trashTitle', { count: chosen.length }), message: t('members.trashMessage'), destructive: true, confirmLabel: t('members.bulk.trash') })) {
      try {
        await moveMembersToTrash(chosen);
        toast.success(t('members.trashed', { count: chosen.length }));
        setSelected(null);
      } catch (e) {
        logger.error('Trash failed', e);
        toast.error(t('common.somethingWentWrong'));
      }
    }
  };

  const add = () => router.push('/member/new');

  const header = (
    <Stack.Screen
      options={{
        headerSearchBarOptions: { placeholder: t('members.searchPlaceholder'), onChangeText: (e) => list.setSearch(e.nativeEvent.text), hideWhenScrolling: false },
        headerLeft: () => (
          <Button label={selecting ? t('common.done') : t('common.select')} variant="ghost" size="sm" onPress={() => setSelected(selecting ? null : new Set())} />
        ),
        headerRight: () => (can.create && !selecting ? <HeaderIconButton icon="add" accessibilityLabel={t('quickActions.addMember')} onPress={add} /> : null),
      }}
    />
  );

  const body = () => {
    if (list.failed) return <ErrorState onRetry={list.reload} />;
    if (!members) return <SkeletonList rows={8} />;
    if (members.length === 0) {
      const noneAtAll = !list.isSearching && list.filters.status === 'all';
      return noneAtAll ? (
        <EmptyState icon="people-outline" title={t('members.emptyTitle')} message={t('members.emptyMessage')} actionLabel={can.create ? t('members.addFirst') : undefined} onAction={can.create ? add : undefined} />
      ) : (
        <EmptyState icon="search" title={t('common.noResults')} message={t('members.noMatches')} />
      );
    }
    return (
      <FlashList
        data={members}
        keyExtractor={(m) => m.id}
        extraData={selected}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 76 }} />}
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            currency={currency_code}
            selecting={selecting}
            selected={!!selected?.has(item.id)}
            onPress={(m) => (selecting ? toggle(m.id) : openMember(m.id))}
            onLongPress={(m) => (selecting ? toggle(m.id) : setSelected(new Set([m.id])))}
            onAction={onAction}
          />
        )}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      <FilterBar filters={list.filters} onChange={list.setFilters} sort={list.sort} onOpenFilters={() => setSheet('filters')} onOpenSort={() => setSheet('sort')} />
      <AppText variant="footnote" tone="secondary" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        {selecting ? t('common.selected', { count: chosen.length }) : t('members.count', { count: members?.length ?? 0 })}
      </AppText>
      <View style={{ flex: 1 }}>{body()}</View>
      {selecting ? <BulkBar actions={bulkActions} onAction={(a) => void onBulk(a)} /> : null}

      <FiltersSheet visible={sheet === 'filters'} onClose={() => setSheet(null)} value={list.filters} onApply={list.setFilters} {...lookups} />
      <ChoiceSheet<MemberSort>
        visible={sheet === 'sort'}
        onClose={() => setSheet(null)}
        title={t('members.sort.title')}
        value={list.sort}
        options={SORTS.map((s) => ({ value: s, label: t(`members.sort.${s}`) }))}
        onSelect={list.setSort}
      />
      <TrainerSheet
        visible={sheet === 'trainer'}
        onClose={() => setSheet(null)}
        trainers={lookups.trainers}
        onSelect={async (trainer) => {
          try {
            await assignTrainer(chosen, trainer);
            toast.success(t('members.trainerAssigned', { count: chosen.length }));
            setSelected(null);
          } catch (e) {
            logger.error('Assign trainer failed', e);
            toast.error(t('common.somethingWentWrong'));
          }
        }}
      />
    </View>
  );
}
