import { useTranslation } from 'react-i18next';

import type { MemberSummary } from '@/domain/memberList';
import { formatPhone } from '@/domain/phones';
import { useSettings } from '@/store/settingsStore';
import { formatDate } from '@/utils/format';

/** "12 days left" · "Expires today" · "Expired 5d ago" · "Starts 01/11/2026"… (§10.2 row). */
export function useMemberLabels() {
  const { t } = useTranslation();
  const { date_format } = useSettings();
  return {
    timing: (m: Pick<MemberSummary, 'status' | 'daysLeft' | 'daysSinceExpiry' | 'expiryDate'>): string => {
      switch (m.status) {
        case 'active':
        case 'expiring':
          return m.daysLeft === 0 ? t('members.expiresToday') : t('members.daysLeft', { count: m.daysLeft ?? 0 });
        case 'grace':
        case 'expired':
          return t('members.expiredAgo', { count: m.daysSinceExpiry ?? 0 });
        case 'frozen':
          return t('status.frozen');
        case 'upcoming':
          return t('members.upcoming');
        case 'noPlan':
          return '';
      }
    },
    phone: formatPhone,
    date: (d: string | null) => (d ? formatDate(d, date_format) : ''),
  };
}
