import { useTranslation } from 'react-i18next';

import { PlaceholderNote, ScreenScroll } from '@/components';

// TODO(M09): Scan QR | Search & mark | Today's list, kiosk mode.
export default function CheckinScreen() {
  const { t } = useTranslation();
  return (
    <ScreenScroll>
      <PlaceholderNote text={t('placeholders.checkin')} />
    </ScreenScroll>
  );
}
