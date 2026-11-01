import { useCallback, useEffect, useState } from 'react';

import type { AttendanceRow } from '@/db/repositories/attendance';
import { useDataVersion } from '@/store/dataVersionStore';
import { logger } from '@/utils/logger';

import { loadVisitsBetween } from './checkinActions';

/** Visits between two dates, reloaded after every write. */
export function useVisits(from: string, to: string) {
  const dataVersion = useDataVersion();
  const [rows, setRows] = useState<AttendanceRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setRows(await loadVisitsBetween(from, to));
    } catch (e) {
      logger.error('Loading attendance failed', e);
      setFailed(true);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  return { rows, failed, reload: load };
}
