import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { getDb } from '@/db/client';
import { exportRows } from '@/db/repositories/exportData';
import { toSheet, type Dataset, type ExportFormat } from '@/domain/exportData';
import { slugGym } from '@/domain/backup';
import { shareExport, writeExportFile, type ExportFileFormat } from '@/services/export';
import { toast } from '@/store/feedbackStore';
import { getSettings } from '@/store/settingsStore';
import { formatDate, formatDateTime } from '@/utils/format';
import { logger } from '@/utils/logger';

export type ExportRequest = {
  datasets: Dataset[];
  range: { from: string; to: string } | null;
  format: ExportFileFormat;
  /** "Export selected" from the members list. */
  memberIds?: string[];
};

/** Builds XLSX / CSV files and opens the share sheet (§10.16). */
export function useExport() {
  const { t } = useTranslation();

  const fmt = (): ExportFormat => {
    const s = getSettings();
    const groups: Record<string, string> = { gender: 'members.gender', goal: 'members.goal', source: 'members.source', mode: 'payments.mode', method: 'export.method', kind: 'export.kind', enquiryStatus: 'export.enquiryStatus' };
    return {
      date: (d) => formatDate(d, s.date_format),
      dateTime: (d) => formatDateTime(d, s.date_format, s.language),
      // Unknown enum values fall back to the raw value rather than a missing-key string.
      label: (group, value) => {
        const base = groups[group];
        return base ? t(`${base}.${value}` as never, { defaultValue: value }) : value;
      },
    };
  };

  return async (req: ExportRequest): Promise<boolean> => {
    try {
      const f = fmt();
      const sheets = [];
      for (const d of req.datasets) {
        const rows = await exportRows(getDb(), d, req.range, req.memberIds);
        sheets.push({ name: t(`export.dataset.${d}`), rows: toSheet(d, rows, f, (key) => t(`export.col.${key}` as never, { defaultValue: key })) });
      }
      const stamp = format(new Date(), 'yyyy-MM-dd-HHmm');
      const what = req.datasets.length === 1 ? req.datasets[0] : 'everything';
      const result = await writeExportFile(sheets, req.format, `TransformPro-${slugGym(getSettings().gym_name)}-${what}-${stamp}`);
      if (!result.ok) {
        toast.error(t(result.reason === 'storage' ? 'backup.storageFull' : 'export.failed'));
        return false;
      }
      if ((await shareExport(result.uri, req.format)) === 'unavailable') toast.error(t('receipt.shareUnavailable'));
      return true;
    } catch (e) {
      logger.error('Export failed', e);
      toast.error(t('export.failed'));
      return false;
    }
  };
}
