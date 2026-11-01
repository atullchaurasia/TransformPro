import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PaymentListRow } from '@/db/repositories/paymentList';
import { rangeFor, totalsByMode, type DayRange, type RangePreset } from '@/domain/collections';
import { todayISO } from '@/domain/dates';
import { useDataVersion } from '@/store/dataVersionStore';
import { useSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

import { loadCollections } from './paymentActions';

/** Collections or refunds for a date preset, with totals by mode (§10.5). */
export function useCollections(kind: 'payments' | 'refunds') {
  const dataVersion = useDataVersion();
  const { week_start } = useSettings();
  const [preset, setPreset] = useState<RangePreset>(kind === 'refunds' ? 'thisMonth' : 'today');
  const [custom, setCustom] = useState<DayRange>({ from: todayISO(), to: todayISO() });
  const [rows, setRows] = useState<PaymentListRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const range = rangeFor(preset, todayISO(), week_start, custom);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setRows(await loadCollections(range, kind));
    } catch (e) {
      logger.error('Loading collections failed', e);
      setFailed(true);
    }
    // The range is fully described by its two dates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, kind]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const totals = useMemo(() => totalsByMode(rows ?? []), [rows]);
  return { preset, setPreset, custom, setCustom, range, rows, totals, failed, reload: load };
}
