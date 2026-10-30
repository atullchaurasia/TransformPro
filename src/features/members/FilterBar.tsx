import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components';
import { activeFilterCount, type MemberFilters, type MemberSort, type StatusFilter } from '@/domain/memberList';
import { useTheme } from '@/theme';

const STATUS_CHIPS: StatusFilter[] = ['all', 'active', 'expiring', 'expired', 'frozen', 'upcoming', 'noPlan'];

export type FilterBarProps = {
  filters: MemberFilters;
  onChange: (f: MemberFilters) => void;
  sort: MemberSort;
  onOpenFilters: () => void;
  onOpenSort: () => void;
};

/** Status chips + quick toggles + "Filters" and "Sort" (§10.2). */
export function FilterBar({ filters, onChange, sort, onOpenFilters, onOpenSort }: FilterBarProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const more = activeFilterCount(filters);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
    >
      <Chip label={t('members.filters.button')} icon="options-outline" selected={more > 0} count={more || undefined} onPress={onOpenFilters} />
      <Chip label={t(`members.sort.${sort}`)} icon="swap-vertical" onPress={onOpenSort} />
      {STATUS_CHIPS.map((s) => (
        <Chip key={s} label={t(`members.status.${s}`)} selected={filters.status === s} onPress={() => onChange({ ...filters, status: s })} />
      ))}
      <Chip label={t('members.filters.hasDues')} selected={filters.hasDues} onPress={() => onChange({ ...filters, hasDues: !filters.hasDues })} />
      <Chip
        label={t('members.filters.birthday')}
        icon="gift-outline"
        selected={filters.birthdayThisMonth}
        onPress={() => onChange({ ...filters, birthdayThisMonth: !filters.birthdayThisMonth })}
      />
      <Chip label={t('members.filters.pt')} selected={filters.ptMembers} onPress={() => onChange({ ...filters, ptMembers: !filters.ptMembers })} />
    </ScrollView>
  );
}
