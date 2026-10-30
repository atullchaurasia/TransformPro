import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { MemberSummary } from '@/domain/memberList';
import { firstName } from '@/domain/templates';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { callPhone, openWhatsApp } from '@/services/messaging';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';

import type { RowAction } from './MemberRow';

/** Swipe actions on a member row (§10.2). */
export function useMemberRowActions() {
  const { t } = useTranslation();
  const { gym_name } = useSettings();

  return useCallback(
    async (action: RowAction, m: MemberSummary) => {
      switch (action) {
        case 'call':
          if ((await callPhone(m.phone)) === 'unavailable') toast.error(t('members.cantCall'));
          return;
        case 'whatsapp':
          // TODO(M14): pick a message template instead of the plain greeting.
          if ((await openWhatsApp(m.phone, t('members.whatsappGreeting', { name: firstName(m.fullName), gym: gym_name }))) === 'unavailable') {
            toast.error(t('members.cantWhatsApp'));
          }
          return;
        case 'checkin':
          // TODO(M09): check this member in (with the §6.8 rules).
          return openComingSoon('M09', t('members.actions.checkin'));
        case 'renew':
          // TODO(M07): open the renew flow for this member.
          return openComingSoon('M07', t('members.actions.renew'));
      }
    },
    [t, gym_name],
  );
}

/** Opening a member. TODO(M07): go to the profile (`/member/[id]`) once it exists. */
export function openMember(id: string) {
  router.push({ pathname: '/member/[id]/edit', params: { id } });
}
