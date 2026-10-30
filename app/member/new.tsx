import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, ErrorState, FormScreen, SegmentedControl } from '@/components';
import type { NewMemberResult } from '@/db/repositories/memberCreate';
import { DuplicateCodeError } from '@/db/repositories/memberCreate';
import { todayISO } from '@/domain/dates';
import { useCan } from '@/features/auth/permissions';
import { BasicSection, DetailSections, GymSection } from '@/features/members/MemberFormSections';
import { DuplicatePhoneSheet } from '@/features/members/DuplicatePhoneSheet';
import { PhotoField } from '@/features/members/PhotoField';
import { PlanPaymentStep } from '@/features/members/PlanPaymentStep';
import { SuccessSheet } from '@/features/members/SuccessSheet';
import { createMember, nextMemberCode } from '@/features/members/memberActions';
import { emptyMemberForm, formToMember, type MemberFormValues } from '@/features/members/memberSchema';
import { useMemberForm } from '@/features/members/useMemberForm';
import { useMemberLookups } from '@/features/members/useMemberLookups';
import { openMember } from '@/features/members/useMemberRowActions';
import { usePlanPayment } from '@/features/members/usePlanPayment';
import { toast } from '@/store/feedbackStore';
import { getCurrentStaffId } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

type Step = 'details' | 'plan';

/** Add member (spec §10.2): details → Plan & Payment (can skip) → one-transaction save. */
export default function NewMemberScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const settings = useSettings();
  const canCreate = useCan('members.create');
  const lookups = useMemberLookups();
  const { form, duplicates, clearDuplicates, checkDuplicates } = useMemberForm();
  const pp = usePlanPayment();
  const [step, setStep] = useState<Step>('details');
  const [codePlaceholder, setCodePlaceholder] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<NewMemberResult | null>(null);
  const { control, formState, handleSubmit, getValues, reset, setError } = form;

  useEffect(() => {
    void nextMemberCode().then(setCodePlaceholder).catch((e: unknown) => logger.error('Next code failed', e));
  }, [result]);

  const toPlanStep = handleSubmit(async (values) => {
    if (await checkDuplicates(values)) setStep('plan');
  });

  const save = async (withPlans: boolean) => {
    if (withPlans && pp.hasErrors) return toast.error(t('members.plan.fixErrors'));
    setSaving(true);
    try {
      const values: MemberFormValues = getValues();
      const plan = withPlans && pp.plan?.ok ? pp.plan.plan : null;
      const created = await createMember({
        member: { ...formToMember(values, settings.country_code), createdBy: getCurrentStaffId(), biometricId: null },
        subscriptions: withPlans ? pp.drafts.flatMap((d) => (d ? [(({ price: _p, ...rest }) => rest)(d)] : [])) : [],
        payment: plan && plan.paidPaise > 0 ? { plan, mode: pp.payment.mode, reference: pp.payment.reference.trim() || null, paidOn: pp.payment.paidOn, note: null } : null,
        currency: settings.currency_code,
      });
      setResult(created);
    } catch (e) {
      if (e instanceof DuplicateCodeError) {
        setStep('details');
        setError('memberCode', { message: t('members.form.codeTaken', { code: e.code }) });
      } else {
        logger.error('Saving member failed', e);
        toast.error(t('members.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const addAnother = () => {
    setResult(null);
    reset(emptyMemberForm(todayISO(), settings.default_branch_id));
    pp.reset();
    setStep('details');
  };

  if (!canCreate) return <ErrorState message={t('auth.noPermission')} />;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('quickActions.addMember'),
          headerLeft: () => <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={() => router.back()} />,
        }}
      />
      <FormScreen>
        <SegmentedControl<Step>
          value={step}
          onChange={(s) => (s === 'details' ? setStep('details') : void toPlanStep())}
          options={[
            { value: 'details', label: t('members.form.stepDetails') },
            { value: 'plan', label: t('members.form.stepPlan') },
          ]}
        />
        {step === 'details' ? (
          <>
            <Controller control={control} name="photoUri" render={({ field }) => <PhotoField name={getValues('fullName')} value={field.value} onChange={field.onChange} />} />
            <BasicSection control={control} errors={formState.errors} />
            <GymSection control={control} errors={formState.errors} trainers={lookups.trainers} branches={lookups.branches} codePlaceholder={codePlaceholder} />
            <DetailSections control={control} errors={formState.errors} />
            <Button label={t('members.form.nextPlan')} onPress={() => void toPlanStep()} fullWidth />
          </>
        ) : (
          <>
            <PlanPaymentStep state={pp} plans={lookups.plans.filter((p) => p.isActive && !p.deletedAt)} trainers={lookups.trainers} />
            <View style={{ gap: spacing.sm }}>
              {pp.lines.length > 0 ? <Button label={t('members.form.saveMember')} onPress={() => void save(true)} loading={saving} fullWidth /> : null}
              <Button
                label={pp.lines.length > 0 ? t('members.form.saveWithoutPlan') : t('members.form.skipAndSave')}
                variant={pp.lines.length > 0 ? 'ghost' : 'primary'}
                onPress={() => void save(false)}
                loading={saving && pp.lines.length === 0}
                fullWidth
              />
            </View>
          </>
        )}
      </FormScreen>
      <DuplicatePhoneSheet
        matches={duplicates}
        onClose={clearDuplicates}
        onContinue={() => {
          clearDuplicates();
          setStep('plan');
        }}
        onOpen={(m) => {
          clearDuplicates();
          router.back();
          openMember(m.id);
        }}
      />
      <SuccessSheet
        result={result}
        onAddAnother={addAnother}
        onDone={() => {
          setResult(null);
          router.back();
        }}
      />
    </>
  );
}
