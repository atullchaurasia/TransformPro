import { format as formatFns, isValid, parseISO } from 'date-fns';
import { enIN, hi } from 'date-fns/locale';

import type { LanguageCode } from '@/store/preferencesStore';

/** User-selectable date formats (settings key `date_format`, spec §5.2). */
export type DateFormatSetting = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

const datePatterns: Record<DateFormatSetting, string> = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
};

const locales = { en: enIN, hi } as const;

/**
 * Parses a stored date (`YYYY-MM-DD`, read as a LOCAL calendar day) or a full ISO
 * timestamp. Returns null for anything unparseable.
 */
export function toDate(input: string | Date | null | undefined): Date | null {
  if (input == null || input === '') return null;
  const date = input instanceof Date ? input : parseISO(input);
  return isValid(date) ? date : null;
}

/** Local calendar date as `YYYY-MM-DD` — the storage format for date-only fields (§4). */
export function toISODate(date: Date): string {
  return formatFns(date, 'yyyy-MM-dd');
}

export function formatDate(input: string | Date | null | undefined, setting: DateFormatSetting = 'DD/MM/YYYY'): string {
  const date = toDate(input);
  return date ? formatFns(date, datePatterns[setting]) : '';
}

/** e.g. "12 Oct 2026" / "12 अक्टू॰ 2026" — for summaries and headers. */
export function formatDateMedium(input: string | Date | null | undefined, language: LanguageCode = 'en'): string {
  const date = toDate(input);
  return date ? formatFns(date, 'd MMM yyyy', { locale: locales[language] }) : '';
}

/** e.g. "6:42 PM". */
export function formatTime(input: string | Date | null | undefined, language: LanguageCode = 'en'): string {
  const date = toDate(input);
  return date ? formatFns(date, 'h:mm a', { locale: locales[language] }) : '';
}

export function formatDateTime(
  input: string | Date | null | undefined,
  setting: DateFormatSetting = 'DD/MM/YYYY',
  language: LanguageCode = 'en',
): string {
  const date = toDate(input);
  return date ? `${formatDate(date, setting)} ${formatTime(date, language)}` : '';
}

const numberFormatter = new Intl.NumberFormat('en-IN');

/** Indian digit grouping: 123456 → "1,23,456". */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}
