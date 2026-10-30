import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { AppText, FieldButton } from '@/components';
import type { Branch, Staff } from '@/db/models';
import { todayISO } from '@/domain/dates';
import { ageOn } from '@/domain/memberList';
import { useSettings } from '@/store/settingsStore';

import { MemberPickerSheet } from './MemberPickerSheet';
import { DateInput, IdField, OptionField, PhoneField, Section, TextField, type FieldProps } from './formFields';
import { loadMember } from './memberActions';
import { BLOOD_GROUPS, FITNESS_GOALS, GENDERS, ID_PROOF_TYPES, SOURCES } from './memberSchema';

/** Basic: name, phone, alt phone, email, gender, DOB (+ age), anniversary. */
export function BasicSection(p: FieldProps) {
  const { t } = useTranslation();
  const dob = useWatch({ control: p.control, name: 'dateOfBirth' });
  const age = ageOn(dob, todayISO());
  return (
    <Section title={t('members.form.basic')} initiallyOpen>
      <TextField {...p} name="fullName" label={t('members.form.fullName')} required textContentType="name" autoCapitalize="words" />
      <PhoneField {...p} name="phone" label={t('members.form.phone')} required />
      <PhoneField {...p} name="altPhone" label={t('members.form.altPhone')} />
      <TextField {...p} name="email" label={t('members.form.email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <OptionField {...p} name="gender" label={t('members.form.gender')} options={GENDERS.map((g) => ({ value: g, label: t(`members.gender.${g}`) }))} />
      <DateInput {...p} name="dateOfBirth" label={t('members.form.dob')} maximumDate={todayISO()} />
      {age !== null ? (
        <AppText variant="footnote" tone="secondary">
          {t('members.form.age', { count: age })}
        </AppText>
      ) : null}
      <DateInput {...p} name="anniversaryDate" label={t('members.form.anniversary')} />
    </Section>
  );
}

/** Address, health, emergency contact and ID proof (§10.2). */
export function DetailSections(p: FieldProps) {
  const { t } = useTranslation();
  const { country_code } = useSettings();
  return (
    <>
      <Section title={t('members.form.address')}>
        <TextField {...p} name="address" label={t('members.form.address')} multiline />
        <TextField {...p} name="area" label={t('members.form.area')} />
        <TextField {...p} name="city" label={t('members.form.city')} />
        <TextField {...p} name="pincode" label={t('members.form.pincode')} keyboardType={country_code === '+91' ? 'number-pad' : 'default'} maxLength={10} />
        <TextField {...p} name="occupation" label={t('members.form.occupation')} />
      </Section>
      <Section title={t('members.form.health')}>
        <OptionField {...p} name="bloodGroup" label={t('members.form.bloodGroup')} options={BLOOD_GROUPS.map((b) => ({ value: b, label: b }))} />
        <TextField {...p} name="heightCm" label={t('members.form.height')} keyboardType="decimal-pad" maxLength={5} />
        <TextField {...p} name="medicalConditions" label={t('members.form.medical')} multiline />
        <OptionField {...p} name="fitnessGoal" label={t('members.form.goal')} options={FITNESS_GOALS.map((g) => ({ value: g, label: t(`members.goal.${g}`) }))} />
      </Section>
      <Section title={t('members.form.emergency')}>
        <TextField {...p} name="emergencyContactName" label={t('members.form.emergencyName')} />
        <PhoneField {...p} name="emergencyContactPhone" label={t('members.form.emergencyPhone')} />
        <TextField {...p} name="emergencyContactRelation" label={t('members.form.emergencyRelation')} />
      </Section>
      <Section title={t('members.form.idProof')}>
        <OptionField {...p} name="idProofType" label={t('members.form.idType')} options={ID_PROOF_TYPES.map((x) => ({ value: x, label: t(`members.idProof.${x}`) }))} />
        <TextField {...p} name="idProofNumber" label={t('members.form.idNumber')} autoCapitalize="characters" autoCorrect={false} />
      </Section>
    </>
  );
}

function ReferredByField({ control, excludeId }: FieldProps & { excludeId?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const id = useWatch({ control, name: 'referredByMemberId' });
  const [name, setName] = useState('');
  useEffect(() => {
    if (!id) return setName('');
    void loadMember(id).then((m) => setName(m ? `${m.fullName} (${m.memberCode})` : ''));
  }, [id]);
  return (
    <Controller
      control={control}
      name="referredByMemberId"
      render={({ field }) => (
        <>
          <FieldButton
            label={t('members.form.referredBy')}
            display={name}
            placeholder={t('members.form.searchMember')}
            icon={field.value ? 'close-circle' : 'search'}
            onPress={() => (field.value ? field.onChange(null) : setOpen(true))}
          />
          <MemberPickerSheet visible={open} onClose={() => setOpen(false)} title={t('members.form.referredBy')} excludeId={excludeId} onPick={(m) => field.onChange(m.id)} />
        </>
      )}
    />
  );
}

/** Gym: code, joining date, branch, trainer, source, referred by, notes. */
export function GymSection(p: FieldProps & { trainers: Staff[]; branches: Branch[]; codePlaceholder: string; memberId?: string }) {
  const { t } = useTranslation();
  return (
    <Section title={t('members.form.gym')} initiallyOpen>
      <TextField {...p} name="memberCode" label={t('members.form.code')} placeholder={p.codePlaceholder} autoCapitalize="characters" autoCorrect={false} maxLength={20} />
      <DateInput {...p} name="joiningDate" label={t('members.form.joiningDate')} required />
      {p.branches.length > 1 ? <IdField {...p} name="branchId" label={t('members.form.branch')} options={p.branches.map((b) => ({ value: b.id, label: b.name }))} /> : null}
      <IdField {...p} name="assignedTrainerId" label={t('members.form.trainer')} options={p.trainers.map((s) => ({ value: s.id, label: s.name }))} />
      <OptionField {...p} name="source" label={t('members.form.source')} options={SOURCES.map((s) => ({ value: s, label: t(`members.source.${s}`) }))} />
      <ReferredByField {...p} excludeId={p.memberId} />
      <TextField {...p} name="notes" label={t('members.form.notes')} multiline />
    </Section>
  );
}
