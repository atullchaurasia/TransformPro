import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AmountInput, AppText, Button, Card, Icon } from '@/components';
import { usePlanLabels } from '@/features/plans/usePlanLabels';
import { confirm } from '@/store/feedbackStore';
import { useTheme } from '@/theme';
import { newId } from '@/utils/id';

import { AddPlanSheet } from './AddPlanSheet';
import { StepShell } from './StepShell';
import { currencySymbol, useOnboardingStore } from './onboardingStore';

/** Step 5 — seeded plans with price fields; add and remove (§7). */
export function PlansStep() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { plans, setPlans, next, preferences } = useOnboardingStore();
  const [adding, setAdding] = useState(false);
  const { summary, category } = usePlanLabels();

  const setPrice = (key: string, pricePaise: number | null) =>
    setPlans(useOnboardingStore.getState().plans.map((p) => (p.key === key ? { ...p, pricePaise: pricePaise ?? 0 } : p)));

  const remove = async (key: string, name: string) => {
    if (await confirm({ title: t('onboarding.plans.removeTitle', { name }), destructive: true, confirmLabel: t('common.delete') })) {
      setPlans(useOnboardingStore.getState().plans.filter((p) => p.key !== key));
    }
  };

  return (
    <StepShell title={t('onboarding.plans.title')} subtitle={t('onboarding.plans.subtitle')} onNext={next}>
      <View style={{ gap: spacing.md }}>
        {plans.map((plan) => (
          <Card key={plan.key}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: plan.color }} />
              <View style={{ flex: 1 }}>
                <AppText variant="headline">{plan.name}</AppText>
                <AppText variant="footnote" tone="secondary">
                  {category(plan.category)} · {summary({ ...plan, sessionCount: null })}
                </AppText>
              </View>
              <Pressable
                onPress={() => remove(plan.key, plan.name)}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.plans.remove', { name: plan.name })}
                hitSlop={12}
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="trash-outline" size={22} color={colors.danger} />
              </Pressable>
            </View>
            <AmountInput
              label={t('onboarding.plans.price')}
              value={plan.pricePaise}
              onChange={(v) => setPrice(plan.key, v)}
              currencySymbol={currencySymbol(preferences.currencyCode)}
            />
          </Card>
        ))}
        {plans.length === 0 ? (
          <AppText variant="subhead" tone="secondary" align="center">
            {t('onboarding.plans.empty')}
          </AppText>
        ) : null}
        <Button label={t('onboarding.plans.add')} icon="add" variant="secondary" onPress={() => setAdding(true)} />
        <AppText variant="footnote" tone="tertiary">
          {t('onboarding.plans.later')}
        </AppText>
      </View>
      <AddPlanSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onAdd={(plan) => {
          setPlans([...useOnboardingStore.getState().plans, { ...plan, key: newId() }]);
          setAdding(false);
        }}
      />
    </StepShell>
  );
}
