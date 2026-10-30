import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { AmountInput, BottomSheet, Button, Input, Select } from '@/components';
import type { OnboardingPlan } from '@/db/repositories/onboarding';
import { accentPalette, useTheme } from '@/theme';

import { currencySymbol, useOnboardingStore } from './onboardingStore';
import { planSchema } from './schemas';
import { useSchemaMessages } from './useSchemaMessages';

type PlanForm = z.input<ReturnType<typeof planSchema>>;

export type AddPlanSheetProps = { visible: boolean; onClose: () => void; onAdd: (plan: OnboardingPlan) => void };

/** Quick "add a plan" during onboarding. Full plan editing (sessions, freeze limits…) is M05. */
export function AddPlanSheet({ visible, onClose, onAdd }: AddPlanSheetProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const messages = useSchemaMessages();
  const schema = useMemo(() => planSchema(messages), [messages]);
  const currency = useOnboardingStore((s) => s.preferences.currencyCode);
  const [price, setPrice] = useState<number | null>(null);

  const { control, handleSubmit, formState, reset } = useForm<PlanForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', category: 'membership', durationValue: '1', durationUnit: 'months' },
  });

  const submit = handleSubmit((v) => {
    const count = useOnboardingStore.getState().plans.length;
    onAdd({
      name: v.name.trim(),
      category: v.category,
      durationValue: Number(v.durationValue),
      durationUnit: v.durationUnit,
      color: accentPalette[count % accentPalette.length] ?? '#FF6B2C',
      pricePaise: price ?? 0,
    });
    reset();
    setPrice(null);
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('onboarding.plans.add')}>
      <View style={{ gap: spacing.md, paddingVertical: spacing.md }}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input label={t('plans.fields.name')} required value={field.value} onChangeText={field.onChange} error={formState.errors.name?.message} />
          )}
        />
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select
              label={t('plans.fields.category')}
              value={field.value}
              onChange={field.onChange}
              options={(['membership', 'personal_training', 'service'] as const).map((c) => ({ value: c, label: t(`plans.category.${c}`) }))}
            />
          )}
        />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="durationValue"
              render={({ field }) => (
                <Input
                  label={t('plans.fields.duration')}
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="number-pad"
                  maxLength={3}
                  error={formState.errors.durationValue?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="durationUnit"
              render={({ field }) => (
                <Select
                  label={t('plans.fields.unit')}
                  value={field.value}
                  onChange={field.onChange}
                  options={(['days', 'months', 'years'] as const).map((u) => ({ value: u, label: t(`plans.unit.${u}`) }))}
                />
              )}
            />
          </View>
        </View>
        <AmountInput label={t('onboarding.plans.price')} value={price} onChange={setPrice} currencySymbol={currencySymbol(currency)} />
        <Button label={t('common.add')} onPress={submit} fullWidth />
      </View>
    </BottomSheet>
  );
}
