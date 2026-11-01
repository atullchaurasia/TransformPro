import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { MemberSummary } from '@/domain/memberList';
import { firstName } from '@/domain/templates';
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
          return openCheckin(m.id);
        case 'renew':
          // Renews the latest membership (or adds a first plan) — see useRenewal.
          return router.push({ pathname: '/member/[id]/renew', params: { id: m.id, mode: 'renew' } });
      }
    },
    [t, gym_name],
  );
}

/**
 * Check-in tab → Search & mark for this member, which runs the §6.8 rules and shows the result
 * card (with Override / Renew when blocked). `at` makes each tap a new request.
 */
export function openCheckin(memberId: string) {
  router.push({ pathname: '/checkin', params: { memberId, at: String(Date.now()) } });
}

/** Opens the member profile (§10.2). It lives in the Members tab, so the list stays underneath. */
export function openMember(id: string) {
  router.push({ pathname: '/members/[id]', params: { id } });
}
