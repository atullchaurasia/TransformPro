import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, PinKeypad } from '@/components';
import { PIN_MAX, PIN_MIN, validatePin } from '@/domain/pin';
import { useTheme } from '@/theme';

export type PinSetupProps = {
  /** Called with the confirmed PIN. */
  onComplete: (pin: string) => void;
  onCancel?: () => void;
};

/** Create a 4–6 digit PIN, entered twice (§7 step 3, §8 reset). */
export function PinSetup({ onComplete, onCancel }: PinSetupProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [first, setFirst] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const confirming = first !== null;

  const submit = (pin: string) => {
    if (!confirming) {
      if (validatePin(pin)) return setError(t('pin.tooShort', { min: PIN_MIN, max: PIN_MAX }));
      setFirst(pin);
      setValue('');
      setError(null);
      return;
    }
    if (validatePin(first, pin) === 'mismatch') {
      setFirst(null);
      setValue('');
      setError(t('pin.mismatch'));
      return;
    }
    onComplete(pin);
  };

  const change = (next: string) => {
    setError(null);
    setValue(next);
    // A 6-digit PIN can't get longer, so move on automatically.
    if (next.length === PIN_MAX) submit(next);
  };

  return (
    <View style={{ alignItems: 'center', gap: spacing.lg }}>
      <AppText variant="headline" align="center">
        {confirming ? t('pin.confirmTitle') : t('pin.createTitle', { min: PIN_MIN, max: PIN_MAX })}
      </AppText>
      <AppText variant="footnote" tone={error ? 'danger' : 'secondary'} align="center">
        {error ?? (confirming ? t('pin.confirmHint') : t('pin.createHint'))}
      </AppText>
      <PinKeypad value={value} onChange={change} maxLength={PIN_MAX} error={!!error} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {onCancel || confirming ? (
          <Button
            label={confirming ? t('pin.startOver') : t('common.cancel')}
            variant="ghost"
            onPress={() => {
              if (confirming) {
                setFirst(null);
                setValue('');
              } else onCancel?.();
            }}
          />
        ) : null}
        <Button label={t('common.next')} onPress={() => submit(value)} disabled={value.length < PIN_MIN} />
      </View>
    </View>
  );
}
