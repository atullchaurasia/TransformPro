import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { paiseToInputText, parseRupeesToPaise, type Paise } from '@/domain/money';

import { AppText } from './AppText';
import { Input, type InputProps } from './Input';

export type AmountInputProps = Omit<InputProps, 'value' | 'onChange' | 'onChangeText' | 'keyboardType' | 'left'> & {
  /** Amount in paise; null when empty or invalid. */
  value: Paise | null;
  onChange: (paise: Paise | null) => void;
  currencySymbol?: string;
};

/** Rupee entry field that reads and writes integer paise (CLAUDE.md §4). */
export function AmountInput({ value, onChange, currencySymbol = '₹', ...rest }: AmountInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(() => paiseToInputText(value));

  // Keep the visible text in sync when the value changes from outside (e.g. a plan's
  // price is auto-filled), without clobbering half-typed input like "2000.".
  useEffect(() => {
    if (parseRupeesToPaise(text) !== value) setText(paiseToInputText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      keyboardType="decimal-pad"
      placeholder={t('fields.amountPlaceholder')}
      value={text}
      left={
        <AppText variant="body" tone="secondary">
          {currencySymbol}
        </AppText>
      }
      onChangeText={(next) => {
        setText(next);
        onChange(parseRupeesToPaise(next));
      }}
      {...rest}
    />
  );
}
