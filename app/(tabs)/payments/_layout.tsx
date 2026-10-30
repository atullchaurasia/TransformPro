import { useTranslation } from 'react-i18next';

import { TabStack } from '@/features/navigation/TabStack';

export default function PaymentsLayout() {
  const { t } = useTranslation();
  return <TabStack title={t('tabs.payments')} />;
}
