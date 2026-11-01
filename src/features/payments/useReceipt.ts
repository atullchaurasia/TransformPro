import { useTranslation } from 'react-i18next';

import { getDb } from '@/db/client';
import { loadReceiptData } from '@/db/repositories/paymentList';
import { formatPaise } from '@/domain/money';
import { buildReceipt, type ReceiptModel } from '@/domain/receipt';
import { firstName } from '@/domain/templates';
import { openWhatsApp } from '@/services/messaging';
import { htmlToPdf, imageDataUri, printPdf, sharePdf, type PageSize } from '@/services/pdf';
import { renderReceiptHtml, type ReceiptLabels } from '@/services/receiptTemplate';
import { toast } from '@/store/feedbackStore';
import { getSettings } from '@/store/settingsStore';
import { formatDate } from '@/utils/format';
import { logger } from '@/utils/logger';

async function loadModel(paymentIds: string[]): Promise<ReceiptModel | null> {
  const data = await loadReceiptData(getDb(), paymentIds);
  if (!data) return null;
  const s = getSettings();
  return buildReceipt({
    ...data,
    gym: { name: s.gym_name, address: s.gym_address, phone: s.gym_phone, email: s.gym_email, gstin: s.gym_gstin, logoDataUri: await imageDataUri(s.gym_logo_uri) },
    taxPercent: s.tax_percent,
    terms: s.invoice_terms,
  });
}

/** Receipt / invoice PDF: build, share (WhatsApp, Mail, Files…), print, or send a WhatsApp summary (§10.5). */
export function useReceipt() {
  const { t } = useTranslation();

  const labels = (): ReceiptLabels => ({
    receipt: t('receipt.title'),
    refundReceipt: t('receipt.refundTitle'),
    receiptNo: t('receipt.number'),
    date: t('receipt.date'),
    staff: t('receipt.staff'),
    member: t('receipt.member'),
    code: t('receipt.code'),
    phone: t('receipt.phone'),
    gstin: t('receipt.gstin'),
    plan: t('receipt.plan'),
    advance: t('receipt.advance'),
    period: t('receipt.period'),
    basePrice: t('receipt.basePrice'),
    admission: t('receipt.admission'),
    discount: t('receipt.discount'),
    tax: t('receipt.tax'),
    cgst: t('receipt.cgst'),
    sgst: t('receipt.sgst'),
    total: t('receipt.total'),
    paidNow: t('receipt.paidNow'),
    refunded: t('receipt.refunded'),
    mode: t('receipt.mode'),
    reference: t('receipt.reference'),
    note: t('receipt.note'),
    balanceDue: t('receipt.balanceDue'),
    netAmount: t('receipt.netAmount'),
    thankYou: t('receipt.thankYou'),
  });

  const pdf = async (paymentIds: string[], size: PageSize): Promise<string | null> => {
    try {
      const model = await loadModel(paymentIds);
      if (!model) {
        toast.error(t('receipt.notFound'));
        return null;
      }
      const s = getSettings();
      const html = renderReceiptHtml(model, labels(), { money: (p) => formatPaise(p, s.currency_code), date: (d) => formatDate(d, s.date_format), mode: (m) => t(`payments.mode.${m}`) }, size);
      const result = await htmlToPdf(html, size, `${model.items.map((i) => i.receiptNumber).join('_')}-${size}`);
      if (!result.ok) {
        toast.error(t(result.reason === 'storage' ? 'receipt.storageFull' : 'receipt.pdfFailed'));
        return null;
      }
      return result.uri;
    } catch (e) {
      logger.error('Receipt PDF failed', e);
      toast.error(t('receipt.pdfFailed'));
      return null;
    }
  };

  return {
    share: async (paymentIds: string[], size: PageSize = 'A5') => {
      const uri = await pdf(paymentIds, size);
      if (uri && (await sharePdf(uri)) === 'unavailable') toast.error(t('receipt.shareUnavailable'));
    },
    print: async (paymentIds: string[]) => {
      const uri = await pdf(paymentIds, 'A4');
      if (uri) await printPdf(uri);
    },
    /** WhatsApp can't receive a file through a link — this sends a text summary; the PDF goes via Share. */
    whatsapp: async (paymentIds: string[]) => {
      try {
        const model = await loadModel(paymentIds);
        if (!model) return;
        const s = getSettings();
        const money = (p: number) => formatPaise(p, s.currency_code);
        const due = model.items.reduce((sum, i) => sum + i.balanceDuePaise, 0);
        // TODO(M14): use the "payment_receipt" template.
        const text = t('receipt.whatsappText', {
          name: firstName(model.member.fullName),
          amount: money(Math.abs(model.netAmountPaise)),
          receipt: model.items.map((i) => i.receiptNumber).join(', '),
          gym: s.gym_name,
          due: money(due),
        });
        if ((await openWhatsApp(model.member.phone, text)) === 'unavailable') toast.error(t('members.cantWhatsApp'));
      } catch (e) {
        logger.error('Receipt WhatsApp failed', e);
        toast.error(t('common.somethingWentWrong'));
      }
    },
  };
}
