import { computeSubscriptionPrice, computeTax, formatPaise, PriceError, rupeesToPaise, splitGst } from '@/domain/money';

const noTax = { enabled: false, percent: 18, inclusive: true };
const incl = { enabled: true, percent: 18, inclusive: true };
const excl = { enabled: true, percent: 18, inclusive: false };

describe('money (§6.6)', () => {
  it('formats with Indian grouping and hides .00', () => {
    expect(formatPaise(12345600)).toBe('₹1,23,456');
    expect(formatPaise(12345650)).toBe('₹1,23,456.50');
    expect(rupeesToPaise(19.99)).toBe(1999);
  });

  it('GST inclusive and exclusive', () => {
    expect(computeTax(118000, incl)).toEqual({ taxablePaise: 100000, taxPaise: 18000, grossPaise: 118000 });
    expect(computeTax(100000, excl)).toEqual({ taxablePaise: 100000, taxPaise: 18000, grossPaise: 118000 });
    expect(computeTax(100000, noTax)).toEqual({ taxablePaise: 100000, taxPaise: 0, grossPaise: 100000 });
    // fractional rate stays exact, result is whole paise
    expect(computeTax(100000, { enabled: true, percent: 12.5, inclusive: false }).taxPaise).toBe(12500);
    expect(Number.isInteger(computeTax(99999, incl).taxPaise)).toBe(true);
  });

  it('CGST/SGST half each', () => {
    expect(splitGst(18000)).toEqual({ cgstPaise: 9000, sgstPaise: 9000 });
    expect(splitGst(18001)).toEqual({ cgstPaise: 9000, sgstPaise: 9001 });
  });
});

describe('computeSubscriptionPrice', () => {
  it('total = base + admission − discount (no tax)', () => {
    expect(
      computeSubscriptionPrice({ basePricePaise: 200000, admissionFeePaise: 50000, discount: { type: 'amount', paise: 25000 }, tax: noTax }),
    ).toEqual({ basePricePaise: 200000, admissionFeePaise: 50000, discountPaise: 25000, taxablePaise: 225000, taxPaise: 0, totalPaise: 225000 });
  });

  it('percent discount on base + admission', () => {
    const r = computeSubscriptionPrice({ basePricePaise: 200000, admissionFeePaise: 0, discount: { type: 'percent', percent: 10 }, tax: noTax });
    expect(r.discountPaise).toBe(20000);
    expect(r.totalPaise).toBe(180000);
  });

  it('exclusive GST: total = base + admission − discount + tax', () => {
    const r = computeSubscriptionPrice({ basePricePaise: 100000, admissionFeePaise: 0, tax: excl });
    expect(r).toMatchObject({ taxPaise: 18000, totalPaise: 118000 });
    expect(r.totalPaise).toBe(r.basePricePaise + r.admissionFeePaise - r.discountPaise + r.taxPaise);
  });

  it('inclusive GST: tax is inside the total, not added again', () => {
    const r = computeSubscriptionPrice({ basePricePaise: 118000, admissionFeePaise: 0, tax: incl });
    expect(r).toMatchObject({ taxablePaise: 100000, taxPaise: 18000, totalPaise: 118000 });
  });

  it('rejects discounts larger than the price and bad percentages', () => {
    expect(() => computeSubscriptionPrice({ basePricePaise: 1000, admissionFeePaise: 0, discount: { type: 'amount', paise: 1001 }, tax: noTax })).toThrow(PriceError);
    expect(() => computeSubscriptionPrice({ basePricePaise: 1000, admissionFeePaise: 0, discount: { type: 'percent', percent: 101 }, tax: noTax })).toThrow(PriceError);
  });
});
