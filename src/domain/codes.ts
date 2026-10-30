// Member codes and receipt numbers (spec §6.7). The repository increments the counter in
// the same transaction as the insert; this file only formats and validates.

export const MEMBER_CODE_DIGITS = 4; // GYM0001
export const RECEIPT_DIGITS = 5; // RCPT00001

/** prefix + zero-padded number. Numbers past the padding just grow (GYM10000). */
export function formatCode(prefix: string, n: number, digits: number): string {
  if (!Number.isSafeInteger(n) || n < 1) throw new Error('Code number must be a positive integer');
  return `${prefix.trim().toUpperCase()}${String(n).padStart(digits, '0')}`;
}

export function formatMemberCode(prefix: string, n: number): string {
  return formatCode(prefix, n, MEMBER_CODE_DIGITS);
}

export function formatReceiptNumber(prefix: string, n: number): string {
  return formatCode(prefix, n, RECEIPT_DIGITS);
}

/** Owner-edited codes are trimmed and upper-cased so uniqueness is case-insensitive. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Letters, digits, '-' and '_', 1–20 characters — safe inside a QR payload and a file name. */
export function isValidCode(code: string): boolean {
  return /^[A-Z0-9_-]{1,20}$/.test(normalizeCode(code));
}

/** Prefixes: 0–8 letters/digits. */
export function isValidPrefix(prefix: string): boolean {
  return /^[A-Z0-9]{0,8}$/.test(prefix.trim().toUpperCase());
}

/** QR payload format (§10.4): `TRANSFORMPRO:<member_code>`. */
export const QR_PREFIX = 'TRANSFORMPRO:';

export function memberQrPayload(memberCode: string): string {
  return `${QR_PREFIX}${normalizeCode(memberCode)}`;
}

/** Returns the member code from a scanned QR, or null if it isn't one of ours. */
export function parseMemberQr(payload: string): string | null {
  const text = payload.trim();
  if (!text.toUpperCase().startsWith(QR_PREFIX)) return null;
  const code = normalizeCode(text.slice(QR_PREFIX.length));
  return isValidCode(code) ? code : null;
}
