import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ActionSheet, type IconName } from '@/components';
import { can, type PermissionKey } from '@/domain/permissions';
import { useCurrentStaff } from '@/store/sessionStore';
import { brand } from '@/theme';

import { openComingSoon } from './comingSoon';

type QuickActionKey = 'addMember' | 'recordPayment' | 'markAttendance' | 'addEnquiry' | 'addExpense';
type QuickAction = { key: QuickActionKey; icon: IconName; color: string; permission: PermissionKey; href?: Href; milestone?: string };

// TODO(M16/M17): each owning milestone replaces its `milestone` with a real `href`.
const ACTIONS: QuickAction[] = [
  { key: 'addMember', icon: 'person-add', color: brand.primary, permission: 'members.create', href: '/member/new' },
  { key: 'recordPayment', icon: 'cash', color: brand.success, permission: 'payments.create', href: '/payment/new' },
  { key: 'markAttendance', icon: 'checkmark-done', color: brand.info, permission: 'attendance.mark', href: '/checkin' },
  { key: 'addEnquiry', icon: 'chatbubbles', color: '#9333EA', permission: 'enquiries.manage', milestone: 'M16' },
  { key: 'addExpense', icon: 'receipt', color: brand.warning, permission: 'expenses.manage', milestone: 'M17' },
];

/**
 * Home "+" menu (spec §9): Add Member, Record Payment, Mark Attendance, Add Enquiry, Add Expense.
 * Actions the user can't perform are hidden (§15). The chosen screen opens after the sheet closes (iOS).
 */
export function QuickActionsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const staff = useCurrentStaff();
  const actions = ACTIONS.filter((a) => can(staff, a.permission));
  return (
    <ActionSheet<QuickActionKey>
      visible={visible}
      onClose={onClose}
      title={t('quickActions.title')}
      items={actions.map((a) => ({ key: a.key, label: t(`quickActions.${a.key}`), icon: a.icon, color: a.color }))}
      onSelect={(key) => {
        const a = ACTIONS.find((x) => x.key === key);
        if (a?.href) router.push(a.href);
        else if (a?.milestone) openComingSoon(a.milestone, t(`quickActions.${a.key}`));
      }}
    />
  );
}
