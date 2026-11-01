// Receipt / invoice content (spec §10.5). Pure: the PDF template in `services/pdf.ts` only
// lays this out. One document can hold several payments recorded together (Decisions Log M06).
import type { ISODate, Member, Paise, Payment, PaymentMode, Subscription } from '@/db/models';

import { splitGst } from './money';

export type ReceiptItem = {
  receiptNumber: string;
  isRefund: boolean;
  /** Null = advance payment (no plan yet). */
  planName: string | null;
  period: { start: ISODate; end: ISODate } | null;
  basePricePaise: Paise;
  admissionFeePaise: Paise;
  discountPaise: Paise;
  discountReason: string | null;
  taxPaise: Paise;
  cgstPaise: Paise;
  sgstPaise: Paise;
  totalPaise: Paise;
  amountPaise: Paise;
  /** What was still due on the plan right after this payment. */
  balanceDuePaise: Paise;
};

export type ReceiptModel = {
  gym: { name: string; address: string; phone: string; email: string; gstin: string; logoDataUri: string | null };
  member: Pick<Member, 'fullName' | 'memberCode' | 'phone'>;
  date: ISODate;
  staffName: string | null;
  mode: PaymentMode;
  reference: string | null;
  note: string | null;
  items: ReceiptItem[];
  /** Received minus refunded on this document. */
  netAmountPaise: Paise;
  /** Show CGST/SGST lines: only when a GSTIN is set (§6.6). */
  showGstSplit: boolean;
  taxPercent: number;
  terms: string;
};

type ReceiptPayment = Pick<Payment, 'id' | 'receiptNumber' | 'subscriptionId' | 'amountPaise' | 'isRefund' | 'deletedAt' | 'mode' | 'reference' | 'note' | 'paidOn' | 'receivedBy' | 'createdAt'>;

type ReceiptSubscription = Pick<
  Subscription,
  'id' | 'planNameSnapshot' | 'startDate' | 'endDate' | 'basePricePaise' | 'admissionFeePaise' | 'discountPaise' | 'discountReason' | 'taxPaise' | 'totalPaise' | 'status'
>;

/**
 * Due on a plan right after `payment` — counts only payments recorded up to it, so a receipt
 * shared again later still shows the balance as it was then. Deleted payments don't count.
 */
export function dueAfterPayment(sub: Pick<Subscription, 'id' | 'totalPaise' | 'status'>, all: ReceiptPayment[], payment: ReceiptPayment): Paise {
  if (sub.status === 'cancelled') return 0;
  const upTo = all.filter((p) => p.subscriptionId === sub.id && p.deletedAt == null && (p.createdAt < payment.createdAt || p.id === payment.id));
  const net = upTo.reduce((s, p) => s + (p.isRefund ? -p.amountPaise : p.amountPaise), 0);
  return Math.max(0, sub.totalPaise - net);
}

export function buildReceipt(input: {
  payments: ReceiptPayment[];
  /** Every payment of the subscriptions involved (for the balance after each payment). */
  allPayments: ReceiptPayment[];
  subscriptions: ReceiptSubscription[];
  member: Pick<Member, 'fullName' | 'memberCode' | 'phone'>;
  staffNames: Map<string, string>;
  gym: ReceiptModel['gym'];
  taxPercent: number;
  terms: string;
}): ReceiptModel {
  const payments = [...input.payments].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.receiptNumber.localeCompare(b.receiptNumber));
  const first = payments[0];
  if (!first) throw new Error('A receipt needs at least one payment');
  const subs = new Map(input.subscriptions.map((s) => [s.id, s]));

  const items = payments.map((p): ReceiptItem => {
    const sub = p.subscriptionId ? subs.get(p.subscriptionId) : undefined;
    const gst = splitGst(sub?.taxPaise ?? 0);
    return {
      receiptNumber: p.receiptNumber,
      isRefund: p.isRefund,
      planName: sub?.planNameSnapshot ?? null,
      period: sub ? { start: sub.startDate, end: sub.endDate } : null,
      basePricePaise: sub?.basePricePaise ?? 0,
      admissionFeePaise: sub?.admissionFeePaise ?? 0,
      discountPaise: sub?.discountPaise ?? 0,
      discountReason: sub?.discountReason ?? null,
      taxPaise: sub?.taxPaise ?? 0,
      cgstPaise: gst.cgstPaise,
      sgstPaise: gst.sgstPaise,
      totalPaise: sub?.totalPaise ?? 0,
      amountPaise: p.amountPaise,
      balanceDuePaise: sub ? dueAfterPayment(sub, input.allPayments, p) : 0,
    };
  });

  return {
    gym: input.gym,
    member: input.member,
    date: first.paidOn,
    staffName: first.receivedBy ? (input.staffNames.get(first.receivedBy) ?? null) : null,
    mode: first.mode,
    reference: first.reference,
    note: first.note,
    items,
    netAmountPaise: items.reduce((s, i) => s + (i.isRefund ? -i.amountPaise : i.amountPaise), 0),
    showGstSplit: input.gym.gstin.trim() !== '' && items.some((i) => i.taxPaise > 0),
    taxPercent: input.taxPercent,
    terms: input.terms,
  };
}
