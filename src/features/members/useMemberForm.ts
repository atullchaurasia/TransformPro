import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { Member } from '@/db/models';
import { todayISO } from '@/domain/dates';
import { normalizePhone } from '@/domain/phones';
import { useSettings } from '@/store/settingsStore';

import { findDuplicatePhones } from './memberActions';
import { emptyMemberForm, memberFormSchema, type MemberFormValues } from './memberSchema';

/** Shared by Add and Edit: zod-validated form + the duplicate-phone check (§6.9). */
export function useMemberForm(excludeId?: string) {
  const { t } = useTranslation();
  const settings = useSettings();
  const schema = useMemo(
    () =>
      memberFormSchema(
        {
          required: t('validation.required'),
          phone: t('validation.phone'),
          email: t('validation.email'),
          pincode: t('validation.pincode'),
          height: t('validation.height'),
          futureDate: t('validation.futureDate'),
          code: t('validation.memberCode'),
          aadhaar: t('validation.aadhaar'),
          pan: t('validation.pan'),
        },
        settings.country_code,
        todayISO(),
      ),
    [t, settings.country_code],
  );
  const form = useForm<MemberFormValues>({ resolver: zodResolver(schema), defaultValues: emptyMemberForm(todayISO(), settings.default_branch_id) });
  const [duplicates, setDuplicates] = useState<Member[]>([]);

  /** Resolves true if there are no other members with this phone; otherwise shows the sheet. */
  const checkDuplicates = async (values: MemberFormValues): Promise<boolean> => {
    const found = await findDuplicatePhones(normalizePhone(values.phone, settings.country_code), excludeId);
    setDuplicates(found);
    return found.length === 0;
  };

  return { form, duplicates, clearDuplicates: () => setDuplicates([]), checkDuplicates };
}
