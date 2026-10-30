import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BottomSheet, ListRow, type IconName } from '@/components';
import type { PermissionKey } from '@/domain/permissions';
import { useCan } from '@/features/auth/permissions';
import { brand } from '@/theme';

import { openComingSoon } from './comingSoon';

type QuickActionKey = 'addMember' | 'recordPayment' | 'markAttendance' | 'addEnquiry' | 'addExpense';
type QuickAction = { key: QuickActionKey; icon: IconName; color: string; permission: PermissionKey; href?: Href; milestone?: string };

// TODO(M08/M09/M16/M17): each owning milestone replaces its `milestone` with a real `href`.
const ACTIONS: QuickAction[] = [
  { key: 'addMember', icon: 'person-add', color: brand.primary, permission: 'members.create', href: '/member/new' },
  { key: 'recordPayment', icon: 'cash', color: brand.success, permission: 'payments.create', milestone: 'M08' },
  { key: 'markAttendance', icon: 'checkmark-done', color: brand.info, permission: 'attendance.mark', milestone: 'M09' },
  { key: 'addEnquiry', icon: 'chatbubbles', color: '#9333EA', permission: 'enquiries.manage', milestone: 'M16' },
  { key: 'addExpense', icon: 'receipt', color: brand.warning, permission: 'expenses.manage', milestone: 'M17' },
];

function ActionRow({ action, onClose }: { action: QuickAction; onClose: () => void }) {
  const { t } = useTranslation();
  // Actions the user can't perform are hidden, not disabled (§15).
  if (!useCan(action.permission)) return null;
  return (
    <ListRow
      title={t(`quickActions.${action.key}`)}
      icon={action.icon}
      iconBackground={action.color}
      onPress={() => {
        onClose();
        if (action.href) router.push(action.href);
        else if (action.milestone) openComingSoon(action.milestone, t(`quickActions.${action.key}`));
      }}
    />
  );
}

/** Home "+" menu (spec §9): Add Member, Record Payment, Mark Attendance, Add Enquiry, Add Expense. */
export function QuickActionsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('quickActions.title')}>
      <View>
        {ACTIONS.map((a) => (
          <ActionRow key={a.key} action={a} onClose={onClose} />
        ))}
      </View>
    </BottomSheet>
  );
}
