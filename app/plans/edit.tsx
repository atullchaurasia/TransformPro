import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button, ErrorState, FormScreen, SkeletonList } from '@/components';
import type { Plan, PlanCategory } from '@/db/models';
import { isOneTime, PLAN_CATEGORIES } from '@/domain/plans';
import { useCan } from '@/features/auth/permissions';
import { PlanForm } from '@/features/plans/PlanForm';
import { loadPlan, savePlan } from '@/features/plans/planActions';
import { planFormSchema, toPlanInput, type PlanFormValues } from '@/features/plans/planSchema';
import { toast } from '@/store/feedbackStore';
import { accentPalette } from '@/theme';
import { logger } from '@/utils/logger';

function toFormValues(plan: Plan | null, category: PlanCategory): PlanFormValues {
  if (!plan) {
    return {
      name: '',
      category,
      oneTime: false,
      durationValue: '1',
      durationUnit: 'months',
      sessionCount: '',
      pricePaise: null,
      admissionFeePaise: null,
      maxFreezeDays: '0',
      maxFreezeTimes: '0',
      color: accentPalette[0],
      description: '',
    };
  }
  return {
    name: plan.name,
    category: plan.category,
    oneTime: isOneTime(plan),
    durationValue: String(plan.durationValue),
    durationUnit: plan.durationUnit,
    sessionCount: plan.sessionCount ? String(plan.sessionCount) : '',
    pricePaise: plan.pricePaise,
    admissionFeePaise: plan.admissionFeePaise,
    maxFreezeDays: String(plan.maxFreezeDays),
    maxFreezeTimes: String(plan.maxFreezeTimes),
    color: plan.color ?? accentPalette[0],
    description: plan.description ?? '',
  };
}

/** Add / edit plan modal (spec §10.3). */
export default function EditPlanScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; category?: string }>();
  const canManage = useCan('plans.manage');
  const startCategory = PLAN_CATEGORIES.find((c) => c === params.category) ?? 'membership';
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(params.id ? 'loading' : 'ready');
  const [saving, setSaving] = useState(false);

  const schema = useMemo(
    () => planFormSchema({ required: t('validation.required'), number: t('validation.wholeNumber'), amount: t('validation.amount'), sessions: t('plans.sessionsRequired') }),
    [t],
  );
  const { control, handleSubmit, formState, reset } = useForm<PlanFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(null, startCategory),
  });

  useEffect(() => {
    if (!params.id) return;
    loadPlan(params.id)
      .then((plan) => {
        if (!plan) return setState('failed');
        reset(toFormValues(plan, plan.category));
        setState('ready');
      })
      .catch((e: unknown) => {
        logger.error('Loading plan failed', e);
        setState('failed');
      });
  }, [params.id, reset]);

  const save = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const plan = await savePlan(toPlanInput(values), params.id);
      toast.success(params.id ? t('plans.saved', { name: plan.name }) : t('plans.created', { name: plan.name }));
      router.back();
    } catch (e) {
      logger.error('Saving plan failed', e);
      toast.error(t('common.somethingWentWrong'));
      setSaving(false);
    }
  });

  const header = (
    <Stack.Screen
      options={{
        title: params.id ? t('plans.editTitle') : t('plans.add'),
        headerLeft: () => <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={() => router.back()} />,
        headerRight: () => (canManage && state === 'ready' ? <Button label={t('common.save')} variant="ghost" size="sm" loading={saving} onPress={() => void save()} /> : null),
      }}
    />
  );

  if (!canManage || state === 'failed') {
    return (
      <>
        {header}
        <ErrorState message={canManage ? t('plans.notFound') : t('auth.noPermission')} />
      </>
    );
  }
  return (
    <FormScreen>
      {header}
      {state === 'loading' ? <SkeletonList rows={5} /> : <PlanForm control={control} errors={formState.errors} editing={!!params.id} />}
      {state === 'ready' ? <Button label={t('common.save')} onPress={() => void save()} loading={saving} fullWidth /> : null}
    </FormScreen>
  );
}
