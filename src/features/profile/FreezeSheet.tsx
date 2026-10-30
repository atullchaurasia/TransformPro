import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet, Button, DateField, Input, ListRow } from '@/components';
import type { Member, Plan } from '@/db/models';
import { todayISO } from '@/domain/dates';
import { checkFreeze, type FreezeViolation } from '@/domain/freeze';
import type { SubscriptionRow } from '@/domain/memberProfile';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { freezeSchema, type FreezeFormValues } from './lifecycleSchemas';
import { freeze } from './profileActions';
import { useLifecycleMessages } from './useLifecycleMessages';

export type FreezeSheetProps = {
  row: SubscriptionRow | null;
  plan: Plan | undefined;
  member: Member;
  canOverride: boolean;
  onClose: () => void;
};

/** Freeze from a date for N days or until "Unfreeze", within the plan's limits (§6.4). */
export function FreezeSheet({ row, plan, member, canOverride, onClose }: FreezeSheetProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { date_format } = useSettings();
  const messages = useLifecycleMessages();
  const schema = useMemo(() => freezeSchema(messages), [messages]);
  const { control, handleSubmit, reset, formState } = useForm<FreezeFormValues>({ resolver: zodResolver(schema), defaultValues: { fromDate: todayISO(), openEnded: false, days: '', reason: '' } });
  const openEnded = useWatch({ control, name: 'openEnded' });
  const [problems, setProblems] = useState<FreezeViolation[]>([]);
  const [armed, setArmed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row) {
      reset({ fromDate: todayISO(), openEnded: false, days: '', reason: '' });
      setProblems([]);
      setArmed(false);
    }
  }, [row, reset]);

  if (!row) return null;
  const { sub } = row;
  const limits = { maxFreezeDays: plan?.maxFreezeDays ?? 0, maxFreezeTimes: plan?.maxFreezeTimes ?? 0 };
  const history = { timesUsed: row.freezeCount, daysUsed: sub.frozenDaysTotal };
  const unlimited = limits.maxFreezeDays === 0 && limits.maxFreezeTimes === 0;

  const submit = handleSubmit(async (v) => {
    const days = v.openEnded ? null : Number(v.days);
    const check = checkFreeze({ fromDate: v.fromDate, days, subscription: sub }, limits, history, canOverride);
    setProblems(check.violations);
    if (!check.allowed) return;
    const overridden = check.violations.length > 0;
    // Over the plan limit with `membership.freeze_override`: first tap shows the problems and
    // arms the override, the second tap freezes (no dialog over the sheet — iOS can't stack them).
    if (overridden && !armed) return setArmed(true);
    setSaving(true);
    try {
      await freeze(member, sub, { fromDate: v.fromDate, days, reason: v.reason, overridden });
      toast.success(t('profile.freeze.done', { name: sub.planNameSnapshot }));
      onClose();
    } catch (e) {
      logger.error('Freeze failed', e);
      toast.error(t('common.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  });

  return (
    <BottomSheet visible onClose={onClose} title={t('profile.freeze.title', { name: sub.planNameSnapshot })}>
      <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
        <AppText variant="footnote" tone="secondary">
          {unlimited
            ? t('profile.freeze.noLimit')
            : t('profile.freeze.limits', { days: limits.maxFreezeDays || '∞', times: limits.maxFreezeTimes || '∞', usedDays: history.daysUsed, usedTimes: history.timesUsed })}
        </AppText>
        <Controller
          control={control}
          name="fromDate"
          render={({ field }) => (
            <DateField label={t('profile.freeze.from')} value={field.value} onChange={(d) => field.onChange(d ?? '')} minimumDate={sub.startDate} maximumDate={todayISO()} dateFormat={date_format} error={formState.errors.fromDate?.message} />
          )}
        />
        <View style={{ marginHorizontal: -spacing.lg }}>
          <Controller
            control={control}
            name="openEnded"
            render={({ field }) => (
              <ListRow title={t('profile.freeze.openEnded')} subtitle={t('profile.freeze.openEndedHint')} right={<Switch value={field.value} onValueChange={field.onChange} accessibilityLabel={t('profile.freeze.openEnded')} />} />
            )}
          />
        </View>
        {!openEnded ? (
          <Controller
            control={control}
            name="days"
            render={({ field }) => <Input label={t('profile.freeze.days')} value={field.value} onChangeText={field.onChange} keyboardType="number-pad" maxLength={4} error={formState.errors.days?.message} />}
          />
        ) : null}
        <Controller control={control} name="reason" render={({ field }) => <Input label={t('profile.freeze.reason')} value={field.value} onChangeText={field.onChange} maxLength={200} />} />
        {problems.map((p) => (
          <AppText key={p} variant="footnote" tone="danger">
            {t(`profile.freeze.violation.${p}`, { count: Math.max(0, (limits.maxFreezeDays || 0) - history.daysUsed) })}
          </AppText>
        ))}
        {armed ? (
          <AppText variant="footnote" tone="warning">
            {t('profile.freeze.overrideHint')}
          </AppText>
        ) : null}
        <Button
          label={armed ? t('profile.freeze.submitOverride') : t('profile.freeze.submit')}
          variant={armed ? 'destructive' : 'primary'}
          icon="snow-outline"
          onPress={() => void submit()}
          loading={saving}
          fullWidth
        />
      </View>
    </BottomSheet>
  );
}
