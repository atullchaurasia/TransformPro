import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components';
import { useTheme } from '@/theme';

import { useReceipt } from './useReceipt';

/**
 * Inline receipt buttons for success screens: Share (A5 / A4), Print, WhatsApp (§10.5). Inline
 * rather than in a sheet so the iOS share sheet never has to open over another modal.
 */
export function ReceiptActions({ paymentIds }: { paymentIds: string[] }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const receipt = useReceipt();
  const [busy, setBusy] = useState<string | null>(null);
  const run = (key: string, task: () => Promise<void>) => async () => {
    setBusy(key);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Button label={t('receipt.shareA5')} icon="share-outline" onPress={run('a5', () => receipt.share(paymentIds, 'A5'))} loading={busy === 'a5'} fullWidth />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label={t('receipt.shareA4Short')} icon="document-outline" variant="secondary" size="sm" onPress={run('a4', () => receipt.share(paymentIds, 'A4'))} loading={busy === 'a4'} style={{ flex: 1 }} />
        <Button label={t('receipt.print')} icon="print-outline" variant="secondary" size="sm" onPress={run('print', () => receipt.print(paymentIds))} loading={busy === 'print'} style={{ flex: 1 }} />
        <Button label={t('receipt.whatsappShort')} icon="logo-whatsapp" variant="secondary" size="sm" onPress={run('wa', () => receipt.whatsapp(paymentIds))} loading={busy === 'wa'} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
