import { useCallback, useEffect, useState } from 'react';

import type { DueMember, DuesSort } from '@/domain/collections';
import { useDataVersion } from '@/store/dataVersionStore';
import { useSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

import { loadDues } from './paymentActions';

export function useDues() {
  const dataVersion = useDataVersion();
  const { expiring_soon_days, grace_period_days } = useSettings();
  const [sort, setSort] = useState<DuesSort>('amount');
  const [data, setData] = useState<{ members: DueMember[]; totalPaise: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setData(await loadDues(sort));
    } catch (e) {
      logger.error('Loading dues failed', e);
      setFailed(true);
    }
    // Status thresholds don't change dues, but keep the summaries consistent with the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, expiring_soon_days, grace_period_days]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  return { sort, setSort, data, failed, reload: load };
}
