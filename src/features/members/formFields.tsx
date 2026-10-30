import { useState, type ReactNode } from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Pressable, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, DateField, Icon, Input, PhoneInput, Select } from '@/components';
import { useSettings } from '@/store/settingsStore';
import { minTapSize, useTheme } from '@/theme';

import type { MemberFormValues } from './memberSchema';

type StringKey = { [K in keyof MemberFormValues]: MemberFormValues[K] extends string ? K : never }[keyof MemberFormValues];
type DateKey = 'dateOfBirth' | 'anniversaryDate' | 'joiningDate';

export type FieldProps = { control: Control<MemberFormValues>; errors: FieldErrors<MemberFormValues> };

/** Collapsible form section (§10.2 "sections, collapsible"). */
export function Section({ title, children, initiallyOpen = false }: { title: string; children: ReactNode; initiallyOpen?: boolean }) {
  const { colors, spacing } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <Card>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: minTapSize }}
      >
        <AppText variant="headline" style={{ flex: 1 }}>
          {title}
        </AppText>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
      </Pressable>
      {open ? <View style={{ gap: spacing.md, marginTop: spacing.sm }}>{children}</View> : null}
    </Card>
  );
}

export function TextField({
  control,
  errors,
  name,
  label,
  required,
  ...rest
}: FieldProps & { name: StringKey; label: string; required?: boolean } & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input label={label} required={required} value={field.value as string} onChangeText={field.onChange} onBlur={field.onBlur} error={errors[name]?.message} {...rest} />
      )}
    />
  );
}

export function PhoneField({ control, errors, name, label, required }: FieldProps & { name: 'phone' | 'altPhone' | 'emergencyContactPhone'; label: string; required?: boolean }) {
  const { country_code } = useSettings();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <PhoneInput label={label} required={required} countryCode={country_code} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors[name]?.message} />
      )}
    />
  );
}

export function DateInput({ control, errors, name, label, required, maximumDate }: FieldProps & { name: DateKey; label: string; required?: boolean; maximumDate?: string }) {
  const { date_format } = useSettings();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <DateField
          label={label}
          required={required}
          value={field.value}
          onChange={(v) => field.onChange(name === 'joiningDate' ? (v ?? field.value) : v)}
          clearable={!required}
          maximumDate={maximumDate}
          dateFormat={date_format}
          error={errors[name]?.message}
        />
      )}
    />
  );
}

const EMPTY = '__none__';

/** Select for optional string fields; "—" clears back to ''. */
export function OptionField<K extends StringKey>({
  control,
  name,
  label,
  options,
}: FieldProps & { name: K; label: string; options: { value: string; label: string }[] }) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          label={label}
          value={(field.value as string) || EMPTY}
          onChange={(v) => field.onChange(v === EMPTY ? '' : v)}
          options={[{ value: EMPTY, label: t('members.form.notSet') }, ...options]}
        />
      )}
    />
  );
}

/** Select for nullable id fields (branch, trainer). */
export function IdField({ control, name, label, options }: FieldProps & { name: 'branchId' | 'assignedTrainerId'; label: string; options: { value: string; label: string }[] }) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          label={label}
          value={field.value ?? EMPTY}
          onChange={(v) => field.onChange(v === EMPTY ? null : v)}
          options={[{ value: EMPTY, label: t('members.form.notSet') }, ...options]}
        />
      )}
    />
  );
}
