import { useCallback, useEffect, useState } from 'react';

import { getDb } from '@/db/client';
import { useDataVersion } from '@/store/dataVersionStore';
import { getSettings, useSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

import { loadDashboard, type DashboardData } from './dashboardData';

/** Dashboard data, reloaded after every write and on pull-to-refresh (§10.1). */
export function useDashboard() {
  const dataVersion = useDataVersion();
  const { expiring_soon_days, grace_period_days, last_backup_at, backup_reminder_days } = useSettings();
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setData(await loadDashboard(getDb(), getSettings()));
    } catch (e) {
      logger.error('Loading dashboard failed', e);
      setFailed(true);
    }
    // Reload when any setting the numbers depend on changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiring_soon_days, grace_period_days, last_backup_at, backup_reminder_days]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { data, failed, reload: load, refresh, refreshing };
}
