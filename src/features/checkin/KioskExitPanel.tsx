import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, PinKeypad } from '@/components';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { tryExitKiosk } from './kiosk';

const PIN_MAX = 6;

/** "Exit kiosk" needs the PIN of whoever started it, or the owner's (§10.4). */
export function KioskExitPanel({ onCancel }: { onCancel: () => void }) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    if (busy || value.length < 4) return;
    setBusy(true);
    try {
      const r = await tryExitKiosk(value);
      if (!r.ok) {
        setPin('');
        setError(r.cooldownMs > 0 ? t('checkin.kiosk.cooldown', { seconds: Math.ceil(r.cooldownMs / 1000) }) : t('checkin.kiosk.wrongPin'));
      }
    } catch (e) {
      logger.error('Kiosk exit failed', e);
      setError(t('common.somethingWentWrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
      <AppText variant="title3">{t('checkin.kiosk.exitTitle')}</AppText>
      <AppText variant="subhead" tone="secondary" align="center">
        {t('checkin.kiosk.exitHint')}
      </AppText>
      <PinKeypad
        value={pin}
        error={!!error}
        disabled={busy}
        onChange={(v) => {
          setError(null);
          setPin(v);
          if (v.length === PIN_MAX) void submit(v);
        }}
      />
      {error ? (
        <AppText variant="footnote" tone="danger">
          {error}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' }}>
        <Button label={t('common.cancel')} variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label={t('checkin.kiosk.exit')} onPress={() => void submit(pin)} disabled={pin.length < 4} loading={busy} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
