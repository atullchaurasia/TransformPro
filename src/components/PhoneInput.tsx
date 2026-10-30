import { useTranslation } from 'react-i18next';

import { AppText } from './AppText';
import { Input, type InputProps } from './Input';

export type PhoneInputProps = Omit<InputProps, 'onChangeText' | 'keyboardType' | 'left'> & {
  /** Digits only, without the country code. */
  onChangeText: (digits: string) => void;
  /** Shown as a prefix, e.g. "+91" (settings key `country_code`). */
  countryCode?: string;
};

/** Phone field with a country-code prefix and a phone keypad. Normalisation to the stored
 * `919876543210` form happens in the domain layer on save (spec §6.9). */
export function PhoneInput({ countryCode = '+91', onChangeText, ...rest }: PhoneInputProps) {
  const { t } = useTranslation();
  return (
    <Input
      keyboardType="phone-pad"
      textContentType="telephoneNumber"
      autoComplete="tel"
      placeholder={t('fields.phonePlaceholder')}
      maxLength={countryCode === '+91' ? 10 : 15}
      left={
        <AppText variant="body" tone="secondary">
          {countryCode}
        </AppText>
      }
      onChangeText={(text) => onChangeText(text.replace(/\D/g, ''))}
      {...rest}
    />
  );
}
