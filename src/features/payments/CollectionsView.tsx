import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, EmptyState, ErrorState, SkeletonList } from '@/components';
import type { PaymentListRow } from '@/db/repositories/paymentList';
import { formatPaise } from '@/domain/money';
import { useMasked } from '@/features/auth/permissions';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import { DateRangeBar } from './DateRangeBar';
import { PaymentRow } from './PaymentRow';
import { ReceiptSheet } from './ReceiptSheet';
import { useCollections } from './useCollections';

/**
 * Collections or Refunds (§10.5): date filter, totals by mode, rows → receipt. Totals are
 * revenue numbers, so they show "••••" without `reports.financial` (§8).
 */
export function CollectionsView({ kind }: { kind: 'payments' | 'refunds' }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code } = useSettings();
  const mask = useMasked();
  const c = useCollections(kind);
  const [open, setOpen] = useState<PaymentListRow | null>(null);
  const money = (p: number) => mask(formatPaise(p, currency_code));

  const totals = (
    <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
      <Card>
        <AppText variant="footnote" tone="secondary" weight="600">
          {t(kind === 'refunds' ? 'payments.totals.refunded' : 'payments.totals.collected').toUpperCase()}
        </AppText>
        <AppText variant="title1" tone={kind === 'refunds' ? 'danger' : 'default'}>
          {money(c.totals.totalPaise)}
        </AppText>
        <AppText variant="footnote" tone="secondary">
          {t('payments.totals.count', { count: c.totals.count })}
        </AppText>
        {c.totals.byMode.length > 0 ? (
          <View style={{ marginTop: spacing.sm, gap: 4 }}>
            {c.totals.byMode.map((m) => (
              <View key={m.mode} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subhead">{`${t(`payments.mode.${m.mode}`)} (${m.count})`}</AppText>
                <AppText variant="subhead" weight="600">
                  {money(m.amountPaise)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );

  const body = () => {
    if (c.failed) return <ErrorState onRetry={c.reload} />;
    if (!c.rows) return <SkeletonList rows={6} />;
    return (
      <FlashList
        data={c.rows}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={totals}
        ListEmptyComponent={<EmptyState icon={kind === 'refunds' ? 'return-down-back-outline' : 'cash-outline'} title={t(kind === 'refunds' ? 'payments.emptyRefunds' : 'payments.emptyCollections')} message={t('payments.emptyHint')} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: spacing.lg }} />}
        renderItem={({ item }) => <PaymentRow row={item} onPress={setOpen} />}
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <DateRangeBar preset={c.preset} onPreset={c.setPreset} custom={c.custom} onCustom={c.setCustom} />
      <View style={{ flex: 1 }}>{body()}</View>
      <ReceiptSheet payments={open ? [open] : null} row={open} onClose={() => setOpen(null)} />
    </View>
  );
}
