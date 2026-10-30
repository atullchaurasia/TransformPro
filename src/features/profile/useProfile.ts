import { useCallback, useEffect, useState } from 'react';

import { useDataVersion } from '@/store/dataVersionStore';
import { useSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

import { loadProfile, type LoadedProfile } from './profileActions';

/** The member profile, reloaded after every write (dataVersion) and when status thresholds change. */
export function useProfile(memberId: string) {
  const dataVersion = useDataVersion();
  const { expiring_soon_days, grace_period_days } = useSettings();
  const [profile, setProfile] = useState<LoadedProfile | null | 'missing'>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setProfile((await loadProfile(memberId)) ?? 'missing');
    } catch (e) {
      logger.error('Loading profile failed', e);
      setFailed(true);
    }
    // Thresholds feed the computed statuses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, expiring_soon_days, grace_period_days]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  return { profile, failed, reload: load };
}
