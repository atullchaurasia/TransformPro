import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet, Button, Icon } from '@/components';
import { authenticateBiometric } from '@/services/auth';
import { toast } from '@/store/feedbackStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { PinSetup } from './PinSetup';
import { resetOwnerPin, signIn } from './session';

/**
 * Owner forgot their PIN (§8). There is no online recovery: with Face ID on, the owner can
 * verify and set a new PIN; otherwise the only way back is reinstall + restore a backup.
 */
export function ForgotPinSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const biometricEnabled = useSettingsStore((s) => s.settings.biometric_enabled);
  const [verified, setVerified] = useState(false);

  const close = () => {
    setVerified(false);
    onClose();
  };

  const verify = async () => {
    const result = await authenticateBiometric(t('lock.resetPrompt'), t('common.cancel'));
    if (result === 'success') setVerified(true);
    else if (result !== 'cancelled') toast.error(t('lock.biometricFailed'));
  };

  const save = async (pin: string) => {
    try {
      const owner = await resetOwnerPin(pin);
      toast.success(t('lock.pinReset'));
      close();
      await signIn(owner, 'biometric');
    } catch (e) {
      logger.error('PIN reset failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  return (
    <BottomSheet visible={visible} onClose={close} title={t('lock.forgotTitle')}>
      <View style={{ gap: spacing.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg }}>
        {verified ? (
          <PinSetup onComplete={save} onCancel={close} />
        ) : biometricEnabled ? (
          <>
            <AppText variant="body" tone="secondary">
              {t('lock.forgotBiometric')}
            </AppText>
            <Button label={t('lock.resetWithFaceId')} icon="scan" onPress={verify} fullWidth />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Icon name="information-circle" size={24} color={colors.info} />
              <AppText variant="body" style={{ flex: 1 }}>
                {t('lock.forgotNoBiometric')}
              </AppText>
            </View>
            <AppText variant="subhead" tone="secondary">
              {t('lock.forgotSteps')}
            </AppText>
            <Button label={t('common.close')} variant="secondary" onPress={close} fullWidth />
          </>
        )}
      </View>
    </BottomSheet>
  );
}
