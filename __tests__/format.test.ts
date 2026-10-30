import { formatPaise, paiseToInputText, parseRupeesToPaise } from '@/domain/money';
import { formatDate, formatDateMedium, formatNumber, formatTime, toDate, toISODate } from '@/utils/format';

describe('money', () => {
  it('formats with Indian grouping and hides .00 when whole', () => {
    expect(formatPaise(12345600)).toBe('₹1,23,456');
    expect(formatPaise(12345650)).toBe('₹1,23,456.50');
    expect(formatPaise(0)).toBe('₹0');
    expect(formatPaise(5)).toBe('₹0.05');
  });

  it('parses typed amounts into paise without float errors', () => {
    expect(parseRupeesToPaise('2000')).toBe(200000);
    expect(parseRupeesToPaise('2,000')).toBe(200000);
    expect(parseRupeesToPaise('₹ 1,23,456.5')).toBe(12345650);
    expect(parseRupeesToPaise('0.1')).toBe(10);
    expect(parseRupeesToPaise('19.99')).toBe(1999); // 19.99 * 100 in floats is 1998.9999…
    expect(parseRupeesToPaise('1.')).toBe(100);
  });

  it('rejects invalid amounts', () => {
    for (const bad of ['', 'abc', '-5', '1.234', '1.2.3', '.']) {
      expect(parseRupeesToPaise(bad)).toBeNull();
    }
  });

  it('round-trips paise to input text', () => {
    expect(paiseToInputText(200000)).toBe('2000');
    expect(paiseToInputText(200050)).toBe('2000.50');
    expect(paiseToInputText(205)).toBe('2.05');
    expect(paiseToInputText(null)).toBe('');
    expect(parseRupeesToPaise(paiseToInputText(1999))).toBe(1999);
  });
});

describe('dates', () => {
  it('reads YYYY-MM-DD as a local calendar day (no timezone shift)', () => {
    const d = toDate('2026-01-31');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(0);
    expect(d?.getDate()).toBe(31);
    expect(toISODate(d!)).toBe('2026-01-31');
  });

  it('formats per the date_format setting', () => {
    expect(formatDate('2026-10-05')).toBe('05/10/2026');
    expect(formatDate('2026-10-05', 'MM/DD/YYYY')).toBe('10/05/2026');
    expect(formatDate('2026-10-05', 'YYYY-MM-DD')).toBe('2026-10-05');
  });

  it('returns empty strings for missing or invalid input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('not-a-date')).toBe('');
    expect(toDate('')).toBeNull();
  });

  it('formats medium dates and times', () => {
    expect(formatDateMedium('2026-10-12')).toBe('12 Oct 2026');
    expect(formatTime(new Date(2026, 9, 12, 18, 42))).toBe('6:42 PM'); // spec §10.4: "Checked in 6:42 PM"
  });

  it('formats numbers with Indian grouping', () => {
    expect(formatNumber(123456)).toBe('1,23,456');
  });
});
