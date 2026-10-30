import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { ActionSheetItem } from '@/components';
import { renewalTarget } from '@/domain/lifecycle';
import { firstName } from '@/domain/templates';
import { useCan } from '@/features/auth/permissions';
import { moveMembersToTrash } from '@/features/members/memberActions';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { callPhone, openSms, openWhatsApp } from '@/services/messaging';
import { confirm, toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

import type { ProfileAction } from './ProfileHeader';
import type { LoadedProfile } from './profileActions';

export type MoreAction = 'edit' | 'shareCard' | 'qr' | 'trash' | 'history';

/** Renew the latest membership, or add a first plan when there is none (§6.3). */
export function openRenew(profile: LoadedProfile) {
  const target = renewalTarget(profile.subscriptions);
  router.push({
    pathname: '/member/[id]/renew',
    params: target ? { id: profile.member.id, mode: 'renew', subscriptionId: target.id } : { id: profile.member.id, mode: 'add' },
  });
}

/** Header action row + More menu of the member profile (§10.2). Hidden when not permitted (§15). */
export function useProfileActions(profile: LoadedProfile | null) {
  const { t } = useTranslation();
  const { gym_name } = useSettings();
  const can = {
    message: useCan('messages.send'),
    checkin: useCan('attendance.mark'),
    renew: useCan('membership.renew'),
    create: useCan('membership.create'),
    collect: useCan('payments.create'),
    edit: useCan('members.edit'),
    trash: useCan('members.delete'),
    audit: useCan('audit.view'),
  };
  const deleted = !!profile?.member.deletedAt;
  const hasPlan = (profile?.subscriptions.length ?? 0) > 0;
  const canRenew = hasPlan ? can.renew : can.create;

  const actions: ProfileAction[] = deleted
    ? ['call', 'more']
    : [
        'call',
        ...(can.message ? (['whatsapp', 'sms'] as const) : []),
        ...(can.checkin ? (['checkin'] as const) : []),
        ...(canRenew ? (['renew'] as const) : []),
        ...(can.collect ? (['collect'] as const) : []),
        'card',
        'more',
      ];

  const moreItems: ActionSheetItem<MoreAction>[] = [
    ...(can.edit ? [{ key: 'edit' as const, label: t('common.edit'), icon: 'create-outline' as const }] : []),
    ...(!deleted ? [{ key: 'shareCard' as const, label: t('profile.more.shareCard'), icon: 'card-outline' as const }] : []),
    ...(!deleted ? [{ key: 'qr' as const, label: t('profile.more.qr'), icon: 'qr-code-outline' as const }] : []),
    ...(can.audit ? [{ key: 'history' as const, label: t('profile.more.history'), icon: 'time-outline' as const }] : []),
    ...(can.trash && !deleted ? [{ key: 'trash' as const, label: t('profile.more.trash'), icon: 'trash-outline' as const, destructive: true }] : []),
  ];

  const onAction = async (a: ProfileAction): Promise<'more' | void> => {
    if (!profile) return;
    const { member } = profile;
    switch (a) {
      case 'call':
        if ((await callPhone(member.phone)) === 'unavailable') toast.error(t('members.cantCall'));
        return;
      case 'whatsapp':
        // TODO(M14): pick a message template and log it to message_log.
        if ((await openWhatsApp(member.phone, t('members.whatsappGreeting', { name: firstName(member.fullName), gym: gym_name }))) === 'unavailable') toast.error(t('members.cantWhatsApp'));
        return;
      case 'sms':
        // TODO(M14): templates + message log.
        if ((await openSms(member.phone)) === 'unavailable') toast.error(t('profile.cantSms'));
        return;
      case 'checkin':
        // TODO(M09): check this member in with the §6.8 rules.
        return openComingSoon('M09', t('members.actions.checkin'));
      case 'renew':
        return openRenew(profile);
      case 'collect':
        // TODO(M08): record a payment for this member.
        return openComingSoon('M08', t('profile.action.collect'));
      case 'card':
        // TODO(M13): digital membership card.
        return openComingSoon('M13', t('profile.action.card'));
      case 'more':
        return 'more';
    }
  };

  const onMore = async (key: MoreAction) => {
    if (!profile) return;
    const { member } = profile;
    switch (key) {
      case 'edit':
        return router.push({ pathname: '/member/[id]/edit', params: { id: member.id } });
      case 'shareCard':
        // TODO(M13): share the membership card PNG.
        return openComingSoon('M13', t('profile.more.shareCard'));
      case 'qr':
        // TODO(M13): show / share the member QR code.
        return openComingSoon('M13', t('profile.more.qr'));
      case 'history':
        return router.push({ pathname: '/members/[id]/history', params: { id: member.id } });
      case 'trash':
        if (!(await confirm({ title: t('members.trashTitle', { count: 1 }), message: t('members.trashMessage'), destructive: true, confirmLabel: t('members.bulk.trash') }))) return;
        try {
          await moveMembersToTrash([member]);
          toast.success(t('members.trashed', { count: 1 }));
          router.back();
        } catch (e) {
          logger.error('Trash failed', e);
          toast.error(t('common.somethingWentWrong'));
        }
    }
  };

  return { actions, moreItems, onAction, onMore };
}
