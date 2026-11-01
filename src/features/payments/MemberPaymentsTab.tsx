import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, ErrorState, SkeletonList } from '@/components';
import type { PaymentListRow } from '@/db/repositories/paymentList';
import { useCan } from '@/features/auth/permissions';
import { useDataVersion } from '@/store/dataVersionStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { loadMemberPayments } from './paymentActions';
import { PaymentRow } from './PaymentRow';
import { ReceiptSheet } from './ReceiptSheet';

/** Profile Payments tab (§10.2): receipts → preview / share / delete; record a payment or refund. */
export function MemberPaymentsTab({ memberId, readOnly }: { memberId: string; readOnly: boolean }) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const dataVersion = useDataVersion();
  const canCreate = useCan('payments.create');
  const canRefund = useCan('payments.refund');
  const [rows, setRows] = useState<PaymentListRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<PaymentListRow | null>(null);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setRows(await loadMemberPayments(memberId));
    } catch (e) {
      logger.error('Loading member payments failed', e);
      setFailed(true);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  return (
    <View style={{ gap: spacing.md }}>
      {!readOnly && (canCreate || canRefund) ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {canCreate ? <Button label={t('quickActions.recordPayment')} icon="cash-outline" variant="secondary" size="sm" onPress={() => router.push({ pathname: '/payment/new', params: { memberId } })} style={{ flex: 1 }} /> : null}
          {canRefund ? <Button label={t('payments.refund.short')} icon="return-down-back-outline" variant="secondary" size="sm" onPress={() => router.push({ pathname: '/payment/refund', params: { memberId } })} style={{ flex: 1 }} /> : null}
        </View>
      ) : null}
      {failed ? (
        <ErrorState onRetry={load} />
      ) : !rows ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SkeletonList rows={4} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState icon="receipt-outline" title={t('payments.memberEmptyTitle')} message={t('payments.memberEmptyMessage')} />
      ) : (
        // A member has a handful of payments, so a plain list inside the profile scroll is fine.
        <View style={{ marginHorizontal: spacing.lg, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface }}>
          {rows.map((r, i) => (
            <View key={r.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.separator } : undefined}>
              <PaymentRow row={r} onPress={setOpen} showMember={false} />
            </View>
          ))}
        </View>
      )}
      <ReceiptSheet payments={open ? [open] : null} row={open} onClose={() => setOpen(null)} />
    </View>
  );
}
