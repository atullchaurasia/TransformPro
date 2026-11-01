// SheetJS helpers with no native code (unit-tested): workbook / CSV out, CSV in.
import * as XLSX from 'xlsx';

import type { Cell } from '@/domain/exportData';

export type SheetData = { name: string; rows: Cell[][] };

/** Excel sheet names: ≤ 31 characters, none of []:*?/\ . */
const sheetName = (name: string) => name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Sheet';

export function workbookBase64(sheets: SheetData[]): string {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows), sheetName(s.name));
  return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }) as string;
}

/** CSV with a UTF-8 BOM so Excel on Windows shows ₹ and Hindi names correctly. */
export function csvText(sheet: SheetData): string {
  return `﻿${XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(sheet.rows))}`;
}

/** Rows of a CSV file (quotes, commas and newlines inside quotes handled by SheetJS). */
export function parseCsv(text: string): string[][] {
  const wb = XLSX.read(text.replace(/^﻿/, ''), { type: 'string', raw: true, dense: true });
  const first = wb.SheetNames[0];
  const ws = first ? wb.Sheets[first] : undefined;
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '', blankrows: false });
  return rows.map((r) => r.map((c) => String(c ?? '').trim()));
}

/** Reads a workbook back (tests and future imports). */
export function readWorkbookBase64(b64: string): { names: string[]; rows: (name: string) => unknown[][] } {
  const wb = XLSX.read(b64, { type: 'base64' });
  return {
    names: wb.SheetNames,
    rows: (name) => {
      const ws = wb.Sheets[name];
      return ws ? XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) : [];
    },
  };
}
