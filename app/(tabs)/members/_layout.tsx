import { useTranslation } from 'react-i18next';

import { TabStack } from '@/features/navigation/TabStack';

// The list stays under a profile opened from another tab or from search, so Back returns to it.
export const unstable_settings = { initialRouteName: 'index' };

export default function MembersLayout() {
  const { t } = useTranslation();
  return <TabStack title={t('tabs.members')} />;
}
