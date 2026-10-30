import { useCallback, useEffect, useMemo, useState } from 'react';

import { todayISO } from '@/domain/dates';
import { filterMembers, NO_FILTERS, sortMembers, type MemberFilters, type MemberSort, type MemberSummary } from '@/domain/memberList';
import { useDataVersion } from '@/store/dataVersionStore';
import { useSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

import { loadMemberSummaries } from './memberActions';

/** Waits `ms` after the last change (search is debounced 200 ms, §10.2). */
export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function useMembersList() {
  const dataVersion = useDataVersion();
  const settings = useSettings();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<MemberFilters>(NO_FILTERS);
  const [sort, setSort] = useState<MemberSort>('name');
  const [all, setAll] = useState<MemberSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const query = useDebounced(search, 200);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setAll(await loadMemberSummaries(query));
    } catch (e) {
      logger.error('Loading members failed', e);
      setFailed(true);
    }
    // Status thresholds change the computed statuses, so reload when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, settings.expiring_soon_days, settings.grace_period_days]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const members = useMemo(() => (all ? sortMembers(filterMembers(all, filters, todayISO()), sort) : null), [all, filters, sort]);

  return { members, failed, reload: load, search, setSearch, filters, setFilters, sort, setSort, isSearching: query.trim() !== '' };
}
