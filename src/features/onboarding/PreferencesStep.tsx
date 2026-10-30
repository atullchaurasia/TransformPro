import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { Input, Select } from '@/components';
import { useTheme } from '@/theme';
import { formatDate, type DateFormatSetting } from '@/utils/format';

import { StepShell } from './StepShell';
import { COUNTRY_CODES, CURRENCIES, useOnboardingStore } from './onboardingStore';
import { preferencesSchema } from './schemas';
import { useSchemaMessages } from './useSchemaMessages';

type PrefsForm = z.input<ReturnType<typeof preferencesSchema>>;

const DATE_FORMATS: DateFormatSetting[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

/** Step 4 — currency, country code, date format, expiring-soon and grace days (§7). */
export function PreferencesStep() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const messages = useSchemaMessages();
  const schema = useMemo(() => preferencesSchema(messages), [messages]);
  const { preferences, setPreferences, next } = useOnboardingStore();

  const { control, handleSubmit, formState } = useForm<PrefsForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...preferences,
      expiringSoonDays: String(preferences.expiringSoonDays),
      graceDays: String(preferences.graceDays),
    },
  });
  const { errors } = formState;

  const onNext = handleSubmit((v) => {
    setPreferences({ ...v, expiringSoonDays: Number(v.expiringSoonDays), graceDays: Number(v.graceDays) });
    next();
  });

  const sample = new Date(2026, 9, 29);

  return (
    <StepShell title={t('onboarding.prefs.title')} subtitle={t('onboarding.prefs.subtitle')} onNext={onNext}>
      <View style={{ gap: spacing.md }}>
        <Controller
          control={control}
          name="currencyCode"
          render={({ field }) => (
            <Select
              label={t('onboarding.prefs.currency')}
              value={field.value}
              onChange={field.onChange}
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.code}` }))}
            />
          )}
        />
        <Controller
          control={control}
          name="countryCode"
          render={({ field }) => (
            <Select
              label={t('onboarding.prefs.countryCode')}
              value={field.value}
              onChange={field.onChange}
              options={COUNTRY_CODES.map((c) => ({ value: c, label: c }))}
            />
          )}
        />
        <Controller
          control={control}
          name="dateFormat"
          render={({ field }) => (
            <Select<DateFormatSetting>
              label={t('onboarding.prefs.dateFormat')}
              value={field.value}
              onChange={field.onChange}
              options={DATE_FORMATS.map((f) => ({ value: f, label: f, description: formatDate(sample, f) }))}
            />
          )}
        />
        <Controller
          control={control}
          name="expiringSoonDays"
          render={({ field }) => (
            <Input
              label={t('onboarding.prefs.expiringSoon')}
              helper={t('onboarding.prefs.expiringSoonHelp')}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.expiringSoonDays?.message}
              keyboardType="number-pad"
              maxLength={2}
            />
          )}
        />
        <Controller
          control={control}
          name="graceDays"
          render={({ field }) => (
            <Input
              label={t('onboarding.prefs.grace')}
              helper={t('onboarding.prefs.graceHelp')}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.graceDays?.message}
              keyboardType="number-pad"
              maxLength={2}
            />
          )}
        />
      </View>
    </StepShell>
  );
}
