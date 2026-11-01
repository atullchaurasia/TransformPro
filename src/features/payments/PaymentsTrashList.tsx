import { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ActionSheet, EmptyState, ErrorState, SkeletonList } from '@/components';
import type { PaymentListRow } from '@/db/repositories/paymentList';
import { formatPaise } from '@/domain/money';
import { useCan } from '@/features/auth/permissions';
import { useDataVersion } from '@/store/dataVersionStore';
import { confirm, toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { deletePaymentsForever, loadTrashedPayments, restoreTrashedPayment } from './paymentActions';
import { PaymentRow } from './PaymentRow';

/** Trash → Payments (§10.2): restore or delete permanently. Both need `payments.delete` (owner, §13). */
export function PaymentsTrashList() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { currency_code } = useSettings();
  const dataVersion = useDataVersion();
  const allowed = useCan('payments.delete');
  const [rows, setRows] = useState<PaymentListRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<PaymentListRow | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setRows(await loadTrashedPayments());
    } catch (e) {
      logger.error('Loading payment trash failed', e);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const run = async (key: 'restore' | 'purge', p: PaymentListRow) => {
    try {
      if (key === 'restore') {
        await restoreTrashedPayment(p);
        toast.success(t('trash.paymentRestored', { receipt: p.receiptNumber }));
        return;
      }
      const ok = await confirm({
        title: t('trash.deletePaymentTitle', { receipt: p.receiptNumber }),
        message: t('trash.deletePaymentMessage', { amount: formatPaise(p.amountPaise, currency_code), name: p.memberName }),
        destructive: true,
        typedConfirmation: 'DELETE',
        confirmLabel: t('trash.deleteForever'),
      });
      if (!ok) return;
      await deletePaymentsForever([p], 'manual');
      toast.success(t('trash.paymentDeleted', { receipt: p.receiptNumber }));
    } catch (e) {
      logger.error('Payment trash action failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  if (failed) return <ErrorState onRetry={load} />;
  if (!rows) return <SkeletonList rows={4} />;
  if (rows.length === 0) return <EmptyState icon="trash-outline" title={t('trash.emptyTitle')} message={t('trash.emptyPayments')} />;
  return (
    <>
      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator }} />}
        renderItem={({ item }) => (
          <PaymentRow
            row={item}
            onPress={(p) => {
              if (!allowed) return;
              setActive(p);
              setOpen(true);
            }}
          />
        )}
      />
      <ActionSheet<'restore' | 'purge'>
        visible={open}
        onClose={() => setOpen(false)}
        title={active?.receiptNumber}
        items={[
          { key: 'restore', label: t('trash.restore'), icon: 'arrow-undo', color: colors.success },
          { key: 'purge', label: t('trash.deleteForever'), icon: 'trash', destructive: true },
        ]}
        onSelect={(k) => active && void run(k, active)}
      />
    </>
  );
}
