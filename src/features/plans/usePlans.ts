import { useCallback, useEffect, useState } from 'react';

import type { PlanCategory } from '@/db/models';
import type { PlanWithCount } from '@/db/repositories/plans';
import { useDataVersion } from '@/store/dataVersionStore';
import { logger } from '@/utils/logger';

import { loadPlans } from './planActions';

/** Plans for one segment; reloads after any write (dataVersion). */
export function usePlans(category: PlanCategory) {
  const dataVersion = useDataVersion();
  const [plans, setPlans] = useState<PlanWithCount[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setPlans(await loadPlans(category));
    } catch (e) {
      logger.error('Loading plans failed', e);
      setFailed(true);
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  return { plans, failed, reload: load };
}
