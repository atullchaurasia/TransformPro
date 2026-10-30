import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button, Card, AppText, ErrorState, FormScreen, SkeletonList } from '@/components';
import type { Member } from '@/db/models';
import { DuplicateCodeError } from '@/db/repositories/memberCreate';
import { useCan } from '@/features/auth/permissions';
import { DuplicatePhoneSheet } from '@/features/members/DuplicatePhoneSheet';
import { BasicSection, DetailSections, GymSection } from '@/features/members/MemberFormSections';
import { PhotoField } from '@/features/members/PhotoField';
import { loadMember, restoreMember, saveMemberEdits } from '@/features/members/memberActions';
import { formToMember, memberToForm, type MemberFormValues } from '@/features/members/memberSchema';
import { useMemberForm } from '@/features/members/useMemberForm';
import { useMemberLookups } from '@/features/members/useMemberLookups';
import { deletePhoto } from '@/services/photos';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

/** Edit member — same form as Add, without the Plan & Payment step (§10.2). */
export default function EditMemberScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { country_code } = useSettings();
  const canEdit = useCan('members.edit');
  const lookups = useMemberLookups();
  const { form, duplicates, clearDuplicates, checkDuplicates } = useMemberForm(id);
  const [member, setMember] = useState<Member | null | 'failed'>(null);
  const [saving, setSaving] = useState(false);
  const { control, formState, handleSubmit, reset, getValues, setError } = form;

  useEffect(() => {
    loadMember(id)
      .then((m) => {
        setMember(m ?? 'failed');
        if (m) reset(memberToForm(m, country_code));
      })
      .catch((e: unknown) => {
        logger.error('Loading member failed', e);
        setMember('failed');
      });
  }, [id, reset, country_code]);

  const persist = async (values: MemberFormValues) => {
    if (!member || member === 'failed') return;
    setSaving(true);
    try {
      const { memberCode, ...rest } = formToMember(values, country_code);
      const saved = await saveMemberEdits(id, { ...rest, memberCode: memberCode ?? member.memberCode });
      // A replaced/removed photo file is cleaned up only once the new data is saved.
      if (member.photoUri && member.photoUri !== saved.photoUri) deletePhoto(member.photoUri);
      toast.success(t('members.saved', { name: saved.fullName }));
      router.back();
    } catch (e) {
      if (e instanceof DuplicateCodeError) setError('memberCode', { message: t('members.form.codeTaken', { code: e.code }) });
      else {
        logger.error('Saving member failed', e);
        toast.error(t('members.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const save = handleSubmit(async (values) => {
    if (await checkDuplicates(values)) await persist(values);
  });

  const header = (
    <Stack.Screen
      options={{
        title: t('members.editTitle'),
        headerLeft: () => <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={() => router.back()} />,
        headerRight: () => (canEdit && member && member !== 'failed' ? <Button label={t('common.save')} variant="ghost" size="sm" loading={saving} onPress={() => void save()} /> : null),
      }}
    />
  );

  if (!canEdit) return <>{header}<ErrorState message={t('auth.noPermission')} /></>;
  if (member === 'failed') return <>{header}<ErrorState message={t('members.notFound')} /></>;

  return (
    <>
      {header}
      <FormScreen>
        {!member ? (
          <SkeletonList rows={6} />
        ) : (
          <>
            {member.deletedAt ? (
              <Card>
                <AppText variant="subhead">{t('members.inTrashBanner')}</AppText>
                <Button
                  label={t('trash.restore')}
                  variant="secondary"
                  size="sm"
                  onPress={() =>
                    void restoreMember(member)
                      .then(() => setMember({ ...member, deletedAt: null }))
                      .then(() => toast.success(t('trash.restored', { name: member.fullName })))
                      .catch(() => toast.error(t('common.somethingWentWrong')))
                  }
                />
              </Card>
            ) : null}
            <Controller control={control} name="photoUri" render={({ field }) => <PhotoField name={getValues('fullName')} value={field.value} onChange={field.onChange} />} />
            <BasicSection control={control} errors={formState.errors} />
            <GymSection control={control} errors={formState.errors} trainers={lookups.trainers} branches={lookups.branches} codePlaceholder="" memberId={id} />
            <DetailSections control={control} errors={formState.errors} />
            <Button label={t('common.save')} onPress={() => void save()} loading={saving} fullWidth />
          </>
        )}
      </FormScreen>
      <DuplicatePhoneSheet
        matches={duplicates}
        onClose={clearDuplicates}
        onContinue={() => {
          clearDuplicates();
          void persist(getValues());
        }}
        onOpen={(m) => {
          clearDuplicates();
          router.replace({ pathname: '/member/[id]/edit', params: { id: m.id } });
        }}
      />
    </>
  );
}
