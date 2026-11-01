import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ActionSheet, AppText } from '@/components';
import type { Payment } from '@/db/models';
import type { PaymentListRow } from '@/db/repositories/paymentList';
import { formatPaise } from '@/domain/money';
import { useCan } from '@/features/auth/permissions';
import { confirm, toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { brand, useTheme } from '@/theme';
import { formatDate } from '@/utils/format';
import { logger } from '@/utils/logger';

import { deletePayment } from './paymentActions';
import { useReceipt } from './useReceipt';

type Action = 'shareA5' | 'shareA4' | 'print' | 'whatsapp' | 'delete';
export type ReceiptPayment = Pick<Payment, 'id' | 'receiptNumber' | 'amountPaise' | 'isRefund' | 'paidOn' | 'mode'>;

export type ReceiptSheetProps = {
  /** Payments on one receipt (one save can create several, Decisions Log M06). Null = closed. */
  payments: ReceiptPayment[] | null;
  /** A single listed payment: enables Delete (owner, `payments.delete`). */
  row?: PaymentListRow | null;
  onClose: () => void;
};

/** Receipt preview → share PDF (A5 / A4), print, WhatsApp, delete (§10.5). */
export function ReceiptSheet({ payments, row, onClose }: ReceiptSheetProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code, date_format } = useSettings();
  const receipt = useReceipt();
  const canDelete = useCan('payments.delete');
  // Keep the content while the sheet animates away; actions run after it has closed (iOS).
  const [shown, setShown] = useState<{ payments: ReceiptPayment[]; row: PaymentListRow | null } | null>(null);
  // Compared by ids: callers may pass a fresh array on every render.
  const key = (list: ReceiptPayment[] | undefined) => (list ?? []).map((p) => p.id).join(',');
  if (payments && (key(payments) !== key(shown?.payments) || (row ?? null) !== shown?.row)) setShown({ payments, row: row ?? null });

  const list = shown?.payments ?? [];
  const ids = list.map((p) => p.id);
  const net = list.reduce((s, p) => s + (p.isRefund ? -p.amountPaise : p.amountPaise), 0);
  const first = list[0];

  const remove = async (r: PaymentListRow) => {
    const ok = await confirm({
      title: t('receipt.deleteTitle', { receipt: r.receiptNumber }),
      message: t('receipt.deleteMessage', { amount: formatPaise(r.amountPaise, currency_code), name: r.memberName }),
      destructive: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deletePayment(r);
      toast.success(t('receipt.deleted', { receipt: r.receiptNumber }));
    } catch (e) {
      logger.error('Delete payment failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  const onSelect = (a: Action) => {
    if (a === 'shareA5' || a === 'shareA4') return void receipt.share(ids, a === 'shareA5' ? 'A5' : 'A4');
    if (a === 'print') return void receipt.print(ids);
    if (a === 'whatsapp') return void receipt.whatsapp(ids);
    if (shown?.row) void remove(shown.row);
  };

  return (
    <ActionSheet<Action>
      visible={payments !== null}
      onClose={onClose}
      title={list.map((p) => p.receiptNumber).join(', ')}
      onSelect={onSelect}
      header={
        first ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 2 }}>
            <AppText variant="title2" tone={net < 0 ? 'danger' : 'default'}>
              {formatPaise(Math.abs(net), currency_code)}
            </AppText>
            <AppText variant="subhead" tone="secondary">
              {[shown?.row?.memberName, shown?.row?.planName, formatDate(first.paidOn, date_format), t(`payments.mode.${first.mode}`)].filter(Boolean).join(' · ')}
            </AppText>
            {net < 0 ? (
              <AppText variant="footnote" tone="danger">
                {t('receipt.refundTitle')}
              </AppText>
            ) : null}
          </View>
        ) : null
      }
      items={[
        { key: 'shareA5', label: t('receipt.shareA5'), icon: 'share-outline' },
        { key: 'shareA4', label: t('receipt.shareA4'), icon: 'document-outline', color: colors.info },
        { key: 'print', label: t('receipt.print'), icon: 'print-outline', color: colors.textSecondary },
        { key: 'whatsapp', label: t('receipt.whatsapp'), icon: 'logo-whatsapp', color: brand.whatsapp },
        ...(canDelete && shown?.row ? [{ key: 'delete' as const, label: t('receipt.delete'), icon: 'trash-outline' as const, destructive: true }] : []),
      ]}
    />
  );
}
