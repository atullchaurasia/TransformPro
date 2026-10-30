import { formatMemberCode, formatReceiptNumber, isValidCode, memberQrPayload, normalizeCode, parseMemberQr } from '@/domain/codes';
import { formatPhone, normalizePhone, samePhone, validatePhone } from '@/domain/phones';

describe('codes (§6.7)', () => {
  it('prefix + zero-padded number', () => {
    expect(formatMemberCode('GYM', 1)).toBe('GYM0001');
    expect(formatMemberCode('tp', 42)).toBe('TP0042');
    expect(formatMemberCode('GYM', 12345)).toBe('GYM12345');
    expect(formatReceiptNumber('RCPT', 1)).toBe('RCPT00001');
    expect(() => formatMemberCode('GYM', 0)).toThrow();
  });

  it('owner-edited codes are normalised and validated', () => {
    expect(normalizeCode(' gym0007 ')).toBe('GYM0007');
    expect(isValidCode('GYM-7')).toBe(true);
    expect(isValidCode('GYM 7')).toBe(false);
    expect(isValidCode('')).toBe(false);
  });

  it('QR payload round-trips and rejects foreign codes', () => {
    expect(memberQrPayload('gym0001')).toBe('TRANSFORMPRO:GYM0001');
    expect(parseMemberQr('TRANSFORMPRO:GYM0001')).toBe('GYM0001');
    expect(parseMemberQr('transformpro:gym0001')).toBe('GYM0001');
    expect(parseMemberQr('https://example.com')).toBeNull();
    expect(parseMemberQr('TRANSFORMPRO:')).toBeNull();
  });
});

describe('phones (§6.9)', () => {
  it.each([
    ['98765 43210', '919876543210'],
    ['98765-43210', '919876543210'],
    ['09876543210', '919876543210'],
    ['+91 98765 43210', '919876543210'],
    ['919876543210', '919876543210'],
    ['(987) 654-3210', '919876543210'],
  ])('normalises %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('prepends the gym country code to 10-digit numbers', () => {
    expect(normalizePhone('2025550123', '+1')).toBe('12025550123');
  });

  it('validates Indian mobiles strictly when the country code is +91', () => {
    expect(validatePhone(normalizePhone('9876543210'))).toBeNull();
    expect(validatePhone(normalizePhone('5876543210'))).toBe('invalid_indian_mobile');
    expect(validatePhone(normalizePhone('98765'))).toBe('invalid_indian_mobile');
    expect(validatePhone('')).toBe('required');
    // a number written with another country's code is allowed
    expect(validatePhone(normalizePhone('+44 7911 123456'))).toBeNull();
  });

  it('allows other formats when the country code is not +91', () => {
    expect(validatePhone(normalizePhone('2025550123', '+1'), '+1')).toBeNull();
    expect(validatePhone('12345', '+1')).toBe('invalid');
  });

  it('display formatting and duplicate matching', () => {
    expect(formatPhone('919876543210')).toBe('+91 98765 43210');
    expect(formatPhone('447911123456')).toBe('+447911123456');
    expect(samePhone('098765 43210', '+91-98765-43210')).toBe(true);
    expect(samePhone('', '')).toBe(false);
  });
});
