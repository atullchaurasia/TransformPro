import { Controller, type Control, type FieldErrors, useWatch } from 'react-hook-form';
import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AmountInput, AppText, Input, ListRow, SegmentedControl, Select } from '@/components';
import type { DurationUnit, PlanCategory } from '@/db/models';
import { DEFAULT_SESSION_VALIDITY_DAYS } from '@/domain/dates';
import { DURATION_UNITS, PLAN_CATEGORIES } from '@/domain/plans';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import { ColorPicker } from './ColorPicker';
import type { PlanFormValues } from './planSchema';

export type PlanFormProps = { control: Control<PlanFormValues>; errors: FieldErrors<PlanFormValues>; editing: boolean };

/** Every plan field from §5.2 / §10.3. Validation lives in `planSchema.ts`. */
export function PlanForm({ control, errors, editing }: PlanFormProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { currency_symbol } = useSettings();
  const [category, oneTime, unit] = useWatch({ control, name: ['category', 'oneTime', 'durationUnit'] });
  const showDuration = !(category === 'service' && oneTime);
  const sessions = unit === 'sessions';

  return (
    <View style={{ gap: spacing.lg }}>
      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <SegmentedControl<PlanCategory>
            value={field.value}
            onChange={field.onChange}
            options={PLAN_CATEGORIES.map((c) => ({ value: c, label: t(`plans.segment.${c}`) }))}
          />
        )}
      />
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input label={t('plans.fields.name')} required value={field.value} onChangeText={field.onChange} error={errors.name?.message} placeholder={t('plans.namePlaceholder')} />
        )}
      />

      {category === 'service' ? (
        <View style={{ marginHorizontal: -spacing.lg }}>
          <Controller
            control={control}
            name="oneTime"
            render={({ field }) => (
              <ListRow
                title={t('plans.oneTime')}
                subtitle={t('plans.oneTimeHint')}
                right={<Switch value={field.value} onValueChange={field.onChange} accessibilityLabel={t('plans.oneTime')} />}
              />
            )}
          />
        </View>
      ) : null}

      {showDuration ? (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="durationValue"
              render={({ field }) => (
                <Input
                  label={sessions ? t('plans.fields.validityDays') : t('plans.fields.duration')}
                  required={!sessions}
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder={sessions ? String(DEFAULT_SESSION_VALIDITY_DAYS) : undefined}
                  error={errors.durationValue?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="durationUnit"
              render={({ field }) => (
                <Select<DurationUnit>
                  label={t('plans.fields.unit')}
                  value={field.value}
                  onChange={field.onChange}
                  options={DURATION_UNITS.map((u) => ({ value: u, label: t(`plans.unit.${u}`) }))}
                />
              )}
            />
          </View>
        </View>
      ) : null}

      {showDuration && sessions ? (
        <Controller
          control={control}
          name="sessionCount"
          render={({ field }) => (
            <Input
              label={t('plans.fields.sessionCount')}
              required
              helper={t('plans.sessionsHelp', { days: DEFAULT_SESSION_VALIDITY_DAYS })}
              value={field.value}
              onChangeText={field.onChange}
              keyboardType="number-pad"
              maxLength={3}
              error={errors.sessionCount?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="pricePaise"
        render={({ field }) => (
          <AmountInput
            label={t('plans.fields.price')}
            value={field.value}
            onChange={field.onChange}
            currencySymbol={currency_symbol}
            helper={editing ? t('plans.priceSnapshotHint') : undefined}
            error={errors.pricePaise?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="admissionFeePaise"
        render={({ field }) => (
          <AmountInput label={t('plans.fields.admissionFee')} value={field.value} onChange={field.onChange} currencySymbol={currency_symbol} error={errors.admissionFeePaise?.message} />
        )}
      />

      {category === 'membership' ? (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="maxFreezeDays"
              render={({ field }) => (
                <Input label={t('plans.fields.maxFreezeDays')} value={field.value} onChangeText={field.onChange} keyboardType="number-pad" maxLength={3} error={errors.maxFreezeDays?.message} />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="maxFreezeTimes"
              render={({ field }) => (
                <Input label={t('plans.fields.maxFreezeTimes')} value={field.value} onChangeText={field.onChange} keyboardType="number-pad" maxLength={2} error={errors.maxFreezeTimes?.message} />
              )}
            />
          </View>
        </View>
      ) : null}
      {category === 'membership' ? (
        <AppText variant="footnote" tone="tertiary" style={{ marginTop: -spacing.sm }}>
          {t('plans.freezeHint')}
        </AppText>
      ) : null}

      <Controller control={control} name="color" render={({ field }) => <ColorPicker label={t('plans.fields.color')} value={field.value} onChange={field.onChange} />} />
      <Controller
        control={control}
        name="description"
        render={({ field }) => <Input label={t('plans.fields.description')} value={field.value} onChangeText={field.onChange} multiline maxLength={300} />}
      />
    </View>
  );
}
