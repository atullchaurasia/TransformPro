import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useMemo, useState } from 'react';

import { autoMap, validateImport, type ColumnMapping, type ImportField, type RowResult } from '@/domain/csvImport';
import { todayISO } from '@/domain/dates';
import { parseCsv } from '@/services/sheets';
import { getSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

import { importRows, loadImportLookups } from './importActions';

type Lookups = Awaited<ReturnType<typeof loadImportLookups>>;

/** Pick CSV → preview → map columns → per-row errors → import valid rows (§10.2). */
export function useImport() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [state, setState] = useState<'idle' | 'loading' | 'importing' | 'done' | 'unreadable'>('idle');
  const [imported, setImported] = useState(0);

  const pick = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', 'text/plain'], copyToCacheDirectory: true });
      const asset = r.canceled ? null : r.assets[0];
      if (!asset) return;
      setState('loading');
      const parsed = parseCsv(await new File(asset.uri).text());
      const [head, ...data] = parsed;
      if (!head || data.length === 0) return setState('unreadable');
      setFileName(asset.name);
      setHeaders(head);
      setRows(data);
      setMapping(autoMap(head));
      setLookups(await loadImportLookups());
      setState('idle');
    } catch (e) {
      logger.error('Reading CSV failed', e);
      setState('unreadable');
    }
  };

  const results: RowResult[] = useMemo(() => {
    if (!mapping || !lookups) return [];
    const s = getSettings();
    return validateImport(rows, mapping, { countryCode: s.country_code, today: todayISO(), dateFormat: s.date_format, plans: lookups.plans, existingPhones: lookups.existingPhones, existingCodes: lookups.existingCodes, skipDuplicates });
  }, [rows, mapping, lookups, skipDuplicates]);

  const valid = results.filter((r): r is Extract<RowResult, { status: 'ok' }> => r.status === 'ok');

  return {
    fileName,
    headers,
    preview: rows.slice(0, 20),
    rowCount: rows.length,
    mapping,
    setField: (field: ImportField, column: number | null) => setMapping((m) => (m ? { ...m, [field]: column } : m)),
    skipDuplicates,
    setSkipDuplicates,
    results,
    valid,
    duplicates: results.filter((r) => r.status === 'duplicate').length,
    errors: results.filter((r): r is Extract<RowResult, { status: 'error' }> => r.status === 'error'),
    state,
    imported,
    pick,
    reset: () => {
      setFileName(null);
      setRows([]);
      setHeaders([]);
      setMapping(null);
      setState('idle');
    },
    run: async () => {
      setState('importing');
      try {
        setImported(await importRows(valid));
        setState('done');
      } catch (e) {
        logger.error('CSV import failed', e);
        setState('idle');
        throw e;
      }
    },
  };
}

export type ImportState = ReturnType<typeof useImport>;
