import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, ChoiceSheet, Select } from '@/components';
import type { Plan, PlanCategory, Staff } from '@/db/models';
import { formatPaise } from '@/domain/money';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import { PaymentCard } from './PaymentCard';
import { PlanLineCard } from './PlanLineCard';
import type { PlanPaymentState } from './usePlanPayment';

const NONE = '__none__';

export type PlanPaymentStepProps = { state: PlanPaymentState; plans: Plan[]; trainers: Staff[] };

/** Add member step 2 (§10.2): membership, optional PT and services, then payment. */
export function PlanPaymentStep({ state, plans, trainers }: PlanPaymentStepProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { currency_code } = useSettings();
  const [adding, setAdding] = useState<PlanCategory | null>(null);
  const byCategory = (c: PlanCategory) => plans.filter((p) => p.category === c);
  const membership = state.lines.find((l) => l.plan.category === 'membership');
  const price = (p: Plan) => formatPaise(p.pricePaise, currency_code);

  return (
    <View style={{ gap: spacing.lg }}>
      <Select
        label={t('members.plan.membership')}
        value={membership?.plan.id ?? NONE}
        onChange={(id) => state.replaceMembership(plans.find((p) => p.id === id) ?? null)}
        options={[{ value: NONE, label: t('members.plan.noMembership') }, ...byCategory('membership').map((p) => ({ value: p.id, label: p.name, description: price(p), color: p.color ?? undefined }))]}
      />
      {state.lines.map((line, i) => (
        <PlanLineCard
          key={`${line.plan.id}-${i}`}
          line={line}
          draft={state.drafts[i] ?? null}
          error={state.errors[i] ?? null}
          trainers={trainers}
          onChange={(l) => state.setLine(i, l)}
          onRemove={() => state.removeLine(i)}
        />
      ))}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {byCategory('personal_training').length > 0 ? (
          <Button label={t('members.plan.addPT')} icon="barbell-outline" variant="secondary" size="sm" onPress={() => setAdding('personal_training')} style={{ flex: 1 }} />
        ) : null}
        {byCategory('service').length > 0 ? (
          <Button label={t('members.plan.addService')} icon="add" variant="secondary" size="sm" onPress={() => setAdding('service')} style={{ flex: 1 }} />
        ) : null}
      </View>
      {state.lines.length > 0 ? (
        <PaymentCard state={state} />
      ) : (
        <AppText variant="subhead" tone="secondary" align="center">
          {t('members.plan.skipHint')}
        </AppText>
      )}
      <ChoiceSheet<string>
        visible={adding !== null}
        onClose={() => setAdding(null)}
        title={adding === 'personal_training' ? t('members.plan.addPT') : t('members.plan.addService')}
        value={null}
        options={(adding ? byCategory(adding) : []).map((p) => ({ value: p.id, label: p.name, description: price(p), color: p.color ?? undefined }))}
        onSelect={(id) => {
          const plan = plans.find((p) => p.id === id);
          if (plan) state.addPlan(plan);
        }}
      />
    </View>
  );
}
