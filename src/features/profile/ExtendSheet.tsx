import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet, Button, DateField, Input } from '@/components';
import type { Member } from '@/db/models';
import { addDaysISO } from '@/domain/dates';
import type { SubscriptionRow } from '@/domain/memberProfile';
import { useMemberLabels } from '@/features/members/useMemberLabels';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { extendSchema, type ExtendFormValues } from './lifecycleSchemas';
import { extend } from './profileActions';
import { useLifecycleMessages } from './useLifecycleMessages';

/** Extend a plan's end date, with a reason that goes to the audit log (§10.2). */
export function ExtendSheet({ row, member, onClose }: { row: SubscriptionRow | null; member: Member; onClose: () => void }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { date_format } = useSettings();
  const labels = useMemberLabels();
  const messages = useLifecycleMessages();
  const currentEnd = row?.sub.endDate ?? '';
  const schema = useMemo(() => extendSchema(messages, currentEnd), [messages, currentEnd]);
  const { control, handleSubmit, reset, formState } = useForm<ExtendFormValues>({ resolver: zodResolver(schema), defaultValues: { endDate: null, reason: '' } });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row) reset({ endDate: addDaysISO(row.sub.endDate, 7), reason: '' });
  }, [row, reset]);

  if (!row) return null;
  const { sub } = row;

  const submit = handleSubmit(async (v) => {
    if (!v.endDate) return;
    setSaving(true);
    try {
      await extend(member, sub, v.endDate, v.reason);
      toast.success(t('profile.extend.done', { date: labels.date(v.endDate) }));
      onClose();
    } catch (e) {
      logger.error('Extend failed', e);
      toast.error(t('common.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  });

  return (
    <BottomSheet visible onClose={onClose} title={t('profile.extend.title', { name: sub.planNameSnapshot })}>
      <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
        <AppText variant="subhead" tone="secondary">
          {t('profile.extend.current', { date: labels.date(sub.endDate) })}
        </AppText>
        <Controller
          control={control}
          name="endDate"
          render={({ field }) => (
            <DateField label={t('profile.extend.newEnd')} required value={field.value} onChange={field.onChange} minimumDate={addDaysISO(sub.endDate, 1)} dateFormat={date_format} error={formState.errors.endDate?.message} />
          )}
        />
        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <Input label={t('profile.extend.reason')} required value={field.value} onChangeText={field.onChange} maxLength={200} placeholder={t('profile.extend.reasonPlaceholder')} error={formState.errors.reason?.message} />
          )}
        />
        <Button label={t('profile.extend.submit')} onPress={() => void submit()} loading={saving} fullWidth />
      </View>
    </BottomSheet>
  );
}
