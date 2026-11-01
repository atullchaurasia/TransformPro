// XLSX / CSV export files (spec §10.16): written to the cache folder and shared.
import { File, Paths } from 'expo-file-system';

import { logger } from '@/utils/logger';

import { shareFile } from './pdf';
import { csvText, workbookBase64, type SheetData } from './sheets';

export { parseCsv, type SheetData } from './sheets';
export type ExportFileFormat = 'xlsx' | 'csv';

const safe = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80) || 'export';

export type ExportResult = { ok: true; uri: string } | { ok: false; reason: 'storage' | 'failed' };

export async function writeExportFile(sheets: SheetData[], format: ExportFileFormat, baseName: string): Promise<ExportResult> {
  try {
    const file = new File(Paths.cache, `${safe(baseName)}.${format}`);
    if (file.exists) file.delete();
    file.create();
    const first = sheets[0];
    if (format === 'csv' && first) await file.write(csvText(first));
    else await file.write(workbookBase64(sheets), { encoding: 'base64' });
    return { ok: true, uri: file.uri };
  } catch (e) {
    logger.warn('Export failed', e);
    return { ok: false, reason: /space|ENOSPC|full/i.test(String(e)) ? 'storage' : 'failed' };
  }
}

export function shareExport(uri: string, format: ExportFileFormat) {
  return format === 'csv'
    ? shareFile(uri, 'text/csv', 'public.comma-separated-values-text')
    : shareFile(uri, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'org.openxmlformats.spreadsheetml.sheet');
}
