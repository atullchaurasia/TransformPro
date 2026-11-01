import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components';
import { useCan } from '@/features/auth/permissions';
import { toast } from '@/store/feedbackStore';
import { useKioskStore } from '@/store/kioskStore';
import { getCurrentStaffId } from '@/store/sessionStore';
import { useSettings, useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

/** Front camera · Sound on/off · Kiosk mode (§10.4). */
export function ScanToolbar() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { checkin_sound } = useSettings();
  const canSettings = useCan('settings.manage');
  const front = useKioskStore((s) => s.frontCamera);
  const setFront = useKioskStore((s) => s.setFrontCamera);
  const start = useKioskStore((s) => s.start);

  const toggleSound = () =>
    void useSettingsStore
      .getState()
      .update({ checkin_sound: !checkin_sound })
      .catch((e: unknown) => {
        logger.error('Saving sound setting failed', e);
        toast.error(t('common.somethingWentWrong'));
      });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
      <Chip label={t('checkin.frontCamera')} icon="camera-reverse-outline" selected={front} onPress={() => setFront(!front)} />
      {canSettings ? <Chip label={t('checkin.sound')} icon={checkin_sound ? 'volume-high-outline' : 'volume-mute-outline'} selected={checkin_sound} onPress={toggleSound} /> : null}
      <Chip
        label={t('checkin.kiosk.start')}
        icon="tablet-landscape-outline"
        onPress={() => {
          start(getCurrentStaffId());
          toast.info(t('checkin.kiosk.started'));
        }}
      />
    </ScrollView>
  );
}
