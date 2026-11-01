import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components';
import type { PaymentListRow } from '@/db/repositories/paymentList';
import { formatPaise } from '@/domain/money';
import { useSettings } from '@/store/settingsStore';
import { minTapSize, useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

export type PaymentRowProps = { row: PaymentListRow; onPress: (r: PaymentListRow) => void; showMember?: boolean };

/** Member, amount, mode, receipt number and staff (§10.5 Collections). */
function PaymentRowBase({ row, onPress, showMember = true }: PaymentRowProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code, date_format } = useSettings();
  const title = showMember ? row.memberName : (row.planName ?? t('receipt.advance'));
  const sub = [showMember ? (row.planName ?? t('receipt.advance')) : null, row.receiptNumber, t(`payments.mode.${row.mode}`), row.staffName].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => onPress(row)}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        minHeight: minTapSize + 12,
        backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="headline" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="footnote" tone="secondary" numberOfLines={1}>
          {sub}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <AppText variant="headline" tone={row.isRefund ? 'danger' : 'default'}>
          {row.isRefund ? '−' : ''}
          {formatPaise(row.amountPaise, currency_code)}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {formatDate(row.paidOn, date_format)}
        </AppText>
      </View>
    </Pressable>
  );
}

export const PaymentRow = memo(PaymentRowBase);
