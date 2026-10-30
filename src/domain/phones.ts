// Phone normalisation and validation (spec §6.9). Stored as digits incl. country code,
// e.g. '919876543210', which is exactly what wa.me / sms: links need.

/** '+91' → '91'. */
export function countryDigits(countryCode: string): string {
  return countryCode.replace(/\D/g, '');
}

/**
 * Normalises what was typed: strips spaces, dashes, brackets and leading zeros, then
 * prepends the country digits to a bare 10-digit number. Returns '' for empty input.
 */
export function normalizePhone(input: string, countryCode = '+91'): string {
  const digits = input.replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10) return `${countryDigits(countryCode)}${digits}`;
  return digits;
}

export type PhoneError = 'required' | 'invalid_indian_mobile' | 'invalid';

/** Validates a normalised phone. Indian mobiles are strict; other countries allow E.164 lengths. */
export function validatePhone(normalized: string, countryCode = '+91'): PhoneError | null {
  if (!normalized) return 'required';
  if (!/^\d+$/.test(normalized)) return 'invalid';
  // Indian numbers (gym in India, or a number written with 91 in front) must be real mobiles.
  // A number typed with another country's code (e.g. +44…) is allowed with E.164 lengths.
  const isIndian = countryDigits(countryCode) === '91' ? normalized.startsWith('91') || normalized.length < 11 : false;
  if (isIndian) return /^91[6-9]\d{9}$/.test(normalized) ? null : 'invalid_indian_mobile';
  return /^\d{8,15}$/.test(normalized) ? null : 'invalid';
}

/** '919876543210' → '+91 98765 43210'; anything else → '+<digits>'. */
export function formatPhone(normalized: string): string {
  if (/^91\d{10}$/.test(normalized)) return `+91 ${normalized.slice(2, 7)} ${normalized.slice(7)}`;
  return normalized ? `+${normalized}` : '';
}

/** Duplicate check helper: two inputs refer to the same number once normalised. */
export function samePhone(a: string, b: string, countryCode = '+91'): boolean {
  const na = normalizePhone(a, countryCode);
  return na !== '' && na === normalizePhone(b, countryCode);
}
