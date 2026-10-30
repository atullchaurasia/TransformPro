import { useEffect, useState } from 'react';

import { getDb } from '@/db/client';
import type { Branch, Plan, Staff } from '@/db/models';
import { plansRepo } from '@/db/repositories';
import { useDataVersion } from '@/store/dataVersionStore';
import { logger } from '@/utils/logger';

import { loadBranches, loadTrainerOptions } from './memberActions';

/** Plans, trainers and branches for filters and the member form. */
export function useMemberLookups() {
  const dataVersion = useDataVersion();
  const [state, setState] = useState<{ plans: Plan[]; trainers: Staff[]; branches: Branch[] }>({ plans: [], trainers: [], branches: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [plans, trainers, branches] = await Promise.all([plansRepo.list(getDb(), { orderBy: 'sortOrder' }), loadTrainerOptions(), loadBranches()]);
        if (alive) setState({ plans, trainers, branches });
      } catch (e) {
        logger.error('Loading member lookups failed', e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dataVersion]);

  return state;
}
