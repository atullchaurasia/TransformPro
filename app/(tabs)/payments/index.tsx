import { useTranslation } from 'react-i18next';

import { PlaceholderNote, ScreenScroll } from '@/components';

// TODO(M08): Collections | Dues | Refunds.
export default function PaymentsScreen() {
  const { t } = useTranslation();
  return (
    <ScreenScroll>
      <PlaceholderNote text={t('placeholders.payments')} />
    </ScreenScroll>
  );
}
