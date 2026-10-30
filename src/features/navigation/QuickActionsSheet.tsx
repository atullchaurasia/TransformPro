import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BottomSheet, ListRow, type IconName } from '@/components';
import { brand } from '@/theme';

import { openComingSoon } from './comingSoon';

type QuickAction = { key: 'addMember' | 'recordPayment' | 'markAttendance' | 'addEnquiry' | 'addExpense'; icon: IconName; color: string; milestone: string };

// TODO(M06/M08/M09/M16/M17): each owning milestone replaces its openComingSoon with the real screen.
const ACTIONS: QuickAction[] = [
  { key: 'addMember', icon: 'person-add', color: brand.primary, milestone: 'M06' },
  { key: 'recordPayment', icon: 'cash', color: brand.success, milestone: 'M08' },
  { key: 'markAttendance', icon: 'checkmark-done', color: brand.info, milestone: 'M09' },
  { key: 'addEnquiry', icon: 'chatbubbles', color: '#9333EA', milestone: 'M16' },
  { key: 'addExpense', icon: 'receipt', color: brand.warning, milestone: 'M17' },
];

/** Home "+" menu (spec §9): Add Member, Record Payment, Mark Attendance, Add Enquiry, Add Expense. */
export function QuickActionsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('quickActions.title')}>
      <View>
        {ACTIONS.map((a) => (
          <ListRow
            key={a.key}
            title={t(`quickActions.${a.key}`)}
            icon={a.icon}
            iconBackground={a.color}
            onPress={() => {
              onClose();
              openComingSoon(a.milestone, t(`quickActions.${a.key}`));
            }}
          />
        ))}
      </View>
    </BottomSheet>
  );
}
