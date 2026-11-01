// Receipt / invoice HTML for expo-print (spec §10.5). Pure string building (no native code)
// so it can be unit-tested; every value from the database is HTML-escaped.
import type { ReceiptModel } from '@/domain/receipt';

export type ReceiptLabels = {
  receipt: string;
  refundReceipt: string;
  receiptNo: string;
  date: string;
  staff: string;
  member: string;
  code: string;
  phone: string;
  gstin: string;
  plan: string;
  advance: string;
  period: string;
  basePrice: string;
  admission: string;
  discount: string;
  tax: string;
  cgst: string;
  sgst: string;
  total: string;
  paidNow: string;
  refunded: string;
  mode: string;
  reference: string;
  note: string;
  balanceDue: string;
  netAmount: string;
  thankYou: string;
};

export type ReceiptFormat = {
  money: (paise: number) => string;
  date: (iso: string) => string;
  mode: (mode: ReceiptModel['mode']) => string;
};

export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

const row = (label: string, value: string, cls = '') => `<tr class="${cls}"><td>${escapeHtml(label)}</td><td class="r">${escapeHtml(value)}</td></tr>`;

export function renderReceiptHtml(m: ReceiptModel, l: ReceiptLabels, f: ReceiptFormat, size: 'A4' | 'A5'): string {
  const allRefunds = m.items.every((i) => i.isRefund);
  const items = m.items
    .map((i) => {
      const lines: string[] = [row(l.receiptNo, i.receiptNumber, 'muted')];
      if (i.planName && !i.isRefund) {
        lines.push(row(l.basePrice, f.money(i.basePricePaise)));
        if (i.admissionFeePaise > 0) lines.push(row(l.admission, f.money(i.admissionFeePaise)));
        if (i.discountPaise > 0) lines.push(row(i.discountReason ? `${l.discount} (${i.discountReason})` : l.discount, `− ${f.money(i.discountPaise)}`));
        if (i.taxPaise > 0) {
          if (m.showGstSplit) {
            lines.push(row(`${l.cgst} ${m.taxPercent / 2}%`, f.money(i.cgstPaise)), row(`${l.sgst} ${m.taxPercent / 2}%`, f.money(i.sgstPaise)));
          } else {
            lines.push(row(`${l.tax} ${m.taxPercent}%`, f.money(i.taxPaise)));
          }
        }
        lines.push(row(l.total, f.money(i.totalPaise), 'strong'));
      }
      lines.push(row(i.isRefund ? l.refunded : l.paidNow, f.money(i.amountPaise), 'strong'));
      if (i.planName) lines.push(row(l.balanceDue, f.money(i.balanceDuePaise), i.balanceDuePaise > 0 ? 'due' : ''));
      const period = i.period ? `<div class="muted">${escapeHtml(l.period)}: ${escapeHtml(f.date(i.period.start))} – ${escapeHtml(f.date(i.period.end))}</div>` : '';
      return `<div class="item"><div class="plan">${escapeHtml(i.planName ?? l.advance)}</div>${period}<table>${lines.join('')}</table></div>`;
    })
    .join('');

  const gym = m.gym;
  const contact = [gym.address, gym.phone, gym.email].filter((s) => s.trim()).map(escapeHtml).join('<br/>');
  const scale = size === 'A5' ? 0.85 : 1;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  @page { size: ${size}; margin: 14mm; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; font-size: ${13 * scale}px; margin: 0; }
  .head { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #111; padding-bottom: 10px; }
  .head img { width: ${56 * scale}px; height: ${56 * scale}px; object-fit: cover; border-radius: 8px; }
  .gym { font-size: ${20 * scale}px; font-weight: 700; }
  h1 { font-size: ${16 * scale}px; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 1px; }
  .meta { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
  .muted { color: #666; }
  .item { border: 1px solid #ddd; border-radius: 8px; padding: 8px 10px; margin: 8px 0; page-break-inside: avoid; }
  .plan { font-weight: 700; font-size: ${15 * scale}px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  td { padding: 3px 0; }
  td.r { text-align: right; }
  tr.strong td { font-weight: 700; }
  tr.due td { color: #B91C1C; font-weight: 700; }
  .net { display: flex; justify-content: space-between; font-size: ${16 * scale}px; font-weight: 700; border-top: 2px solid #111; padding-top: 8px; margin-top: 8px; }
  .terms { white-space: pre-wrap; color: #444; margin-top: 14px; font-size: ${11 * scale}px; }
  .thanks { text-align: center; margin-top: 18px; font-weight: 600; }
</style></head><body>
<div class="head">${gym.logoDataUri ? `<img src="${gym.logoDataUri}"/>` : ''}<div><div class="gym">${escapeHtml(gym.name)}</div><div class="muted">${contact}</div>${
    gym.gstin.trim() ? `<div class="muted">${escapeHtml(l.gstin)}: ${escapeHtml(gym.gstin)}</div>` : ''
  }</div></div>
<h1>${escapeHtml(allRefunds ? l.refundReceipt : l.receipt)}</h1>
<div class="meta">
  <div><div><b>${escapeHtml(m.member.fullName)}</b></div><div class="muted">${escapeHtml(l.code)}: ${escapeHtml(m.member.memberCode)}</div><div class="muted">${escapeHtml(l.phone)}: +${escapeHtml(m.member.phone)}</div></div>
  <div style="text-align:right"><div>${escapeHtml(l.date)}: ${escapeHtml(f.date(m.date))}</div><div>${escapeHtml(l.mode)}: ${escapeHtml(f.mode(m.mode))}</div>${
    m.reference ? `<div>${escapeHtml(l.reference)}: ${escapeHtml(m.reference)}</div>` : ''
  }${m.staffName ? `<div class="muted">${escapeHtml(l.staff)}: ${escapeHtml(m.staffName)}</div>` : ''}</div>
</div>
${items}
${m.items.length > 1 ? `<div class="net"><span>${escapeHtml(l.netAmount)}</span><span>${escapeHtml(f.money(m.netAmountPaise))}</span></div>` : ''}
${m.note ? `<div class="muted">${escapeHtml(l.note)}: ${escapeHtml(m.note)}</div>` : ''}
${m.terms.trim() ? `<div class="terms">${escapeHtml(m.terms)}</div>` : ''}
<div class="thanks">${escapeHtml(l.thankYou)}</div>
</body></html>`;
}
