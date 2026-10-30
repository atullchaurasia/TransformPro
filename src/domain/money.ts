// Money is ALWAYS integer paise (₹1 = 100) — never floats (CLAUDE.md §4, spec §6.6).

export type Paise = number;

export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: Paise): number {
  return paise / 100;
}

const formatters = new Map<string, { whole: Intl.NumberFormat; fractional: Intl.NumberFormat }>();

function getFormatters(currency: string) {
  let entry = formatters.get(currency);
  if (!entry) {
    entry = {
      whole: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
      fractional: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
    formatters.set(currency, entry);
  }
  return entry;
}

/** 12345600 → "₹1,23,456"; 12345650 → "₹1,23,456.50" (".00" hidden when whole, §6.6). */
export function formatPaise(paise: Paise, currency = 'INR'): string {
  const { whole, fractional } = getFormatters(currency);
  return paise % 100 === 0 ? whole.format(paise / 100) : fractional.format(paise / 100);
}

/**
 * Parses what a user typed in an amount field into paise, without float maths.
 * Accepts "2000", "2,000", "₹ 2,000.5", "2000.50". Returns null if empty or invalid
 * (negative numbers and more than 2 decimals are invalid).
 */
export function parseRupeesToPaise(input: string): Paise | null {
  const cleaned = input.replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [rupees, decimals = ''] = cleaned.split('.');
  const paise = Number(rupees) * 100 + Number(decimals.padEnd(2, '0'));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** Paise → editable text for an input: 200000 → "2000", 200050 → "2000.50". */
export function paiseToInputText(paise: Paise | null | undefined): string {
  if (paise == null) return '';
  const rupees = Math.trunc(paise / 100);
  const rest = Math.abs(paise % 100);
  return rest === 0 ? String(rupees) : `${rupees}.${String(rest).padStart(2, '0')}`;
}

// ---- Tax / GST (§6.6) ----

export type TaxSettings = {
  enabled: boolean;
  /** e.g. 18 or 12.5 */
  percent: number;
  /** true: prices already include GST; false: GST is added on top. */
  inclusive: boolean;
};

export type TaxBreakdown = {
  /** Value before tax. */
  taxablePaise: Paise;
  taxPaise: Paise;
  /** What the member pays. */
  grossPaise: Paise;
};

/** Percent → basis points as an integer, so 12.5% stays exact. */
function basisPoints(percent: number): number {
  const bp = Math.round(percent * 100);
  if (!Number.isFinite(bp) || bp < 0) throw new Error('Tax percent must be ≥ 0');
  return bp;
}

export function computeTax(amountPaise: Paise, tax: TaxSettings): TaxBreakdown {
  if (!tax.enabled || amountPaise <= 0) return { taxablePaise: amountPaise, taxPaise: 0, grossPaise: amountPaise };
  const bp = basisPoints(tax.percent);
  if (tax.inclusive) {
    // ₹1,180 incl. 18% → taxable ₹1,000 + GST ₹180.
    const taxPaise = Math.round((amountPaise * bp) / (10000 + bp));
    return { taxablePaise: amountPaise - taxPaise, taxPaise, grossPaise: amountPaise };
  }
  const taxPaise = Math.round((amountPaise * bp) / 10000);
  return { taxablePaise: amountPaise, taxPaise, grossPaise: amountPaise + taxPaise };
}

/** CGST/SGST shown half each on invoices when a GSTIN is set; an odd paisa goes to SGST. */
export function splitGst(taxPaise: Paise): { cgstPaise: Paise; sgstPaise: Paise } {
  const cgstPaise = Math.floor(taxPaise / 2);
  return { cgstPaise, sgstPaise: taxPaise - cgstPaise };
}

export type Discount = { type: 'amount'; paise: Paise } | { type: 'percent'; percent: number };

export type SubscriptionPriceInput = {
  basePricePaise: Paise;
  /** 0 when the admission fee toggle is off. */
  admissionFeePaise: Paise;
  discount?: Discount | null;
  tax: TaxSettings;
};

export type SubscriptionPrice = {
  basePricePaise: Paise;
  admissionFeePaise: Paise;
  discountPaise: Paise;
  taxablePaise: Paise;
  taxPaise: Paise;
  totalPaise: Paise;
};

export class PriceError extends Error {
  constructor(public readonly code: 'negative_amount' | 'discount_too_large' | 'invalid_percent') {
    super(code);
  }
}

/**
 * Subscription total (§5.2/§6.6). Discount (₹ or % of base + admission) comes off before tax.
 * Exclusive GST: total = base + admission − discount + tax.
 * Inclusive GST: total = base + admission − discount, and `taxPaise` is the GST inside it
 * (Decisions Log 2026-10-30 M03) — adding it again would charge GST twice.
 */
export function computeSubscriptionPrice(input: SubscriptionPriceInput): SubscriptionPrice {
  const { basePricePaise, admissionFeePaise, discount, tax } = input;
  if (basePricePaise < 0 || admissionFeePaise < 0) throw new PriceError('negative_amount');
  const subtotal = basePricePaise + admissionFeePaise;

  let discountPaise = 0;
  if (discount?.type === 'amount') {
    if (discount.paise < 0) throw new PriceError('negative_amount');
    discountPaise = discount.paise;
  } else if (discount?.type === 'percent') {
    if (!(discount.percent >= 0 && discount.percent <= 100)) throw new PriceError('invalid_percent');
    discountPaise = Math.round((subtotal * basisPoints(discount.percent)) / 10000);
  }
  if (discountPaise > subtotal) throw new PriceError('discount_too_large');

  const { taxablePaise, taxPaise, grossPaise } = computeTax(subtotal - discountPaise, tax);
  return { basePricePaise, admissionFeePaise, discountPaise, taxablePaise, taxPaise, totalPaise: grossPaise };
}
