import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Avatar, Button, ErrorState, PinKeypad, SkeletonList } from '@/components';
import { PIN_MAX, PIN_MIN } from '@/domain/pin';
import { ForgotPinSheet } from '@/features/auth/ForgotPinSheet';
import { StaffPicker } from '@/features/auth/StaffPicker';
import { useLockScreen } from '@/features/auth/useLockScreen';
import { resolvePhotoUri } from '@/services/photos';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

/** App lock (spec §8): staff avatars → PIN keypad, Face ID for the owner, cooldown, forgot PIN. */
export default function LockScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const lock = useLockScreen();
  const [forgot, setForgot] = useState(false);

  const body = () => {
    if (lock.loadFailed) return <ErrorState onRetry={lock.reload} />;
    if (!lock.staff) return <SkeletonList rows={3} />;
    if (!lock.selected) return <StaffPicker staff={lock.staff} onSelect={lock.choose} />;

    const coolingDown = lock.cooldownSeconds > 0;
    return (
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <Avatar name={lock.selected.name} uri={resolvePhotoUri(lock.selected.photoUri)} size={72} />
        <AppText variant="title3">{t('lock.hello', { name: lock.selected.name })}</AppText>
        <AppText variant="subhead" tone={lock.error || coolingDown ? 'danger' : 'secondary'} align="center" accessibilityLiveRegion="polite">
          {coolingDown ? t('lock.cooldown', { seconds: lock.cooldownSeconds }) : (lock.error ?? t('lock.enterPin'))}
        </AppText>
        <PinKeypad
          value={lock.pin}
          onChange={(v) => {
            lock.setPin(v);
            if (v.length === PIN_MAX) void lock.submit(v);
          }}
          maxLength={PIN_MAX}
          disabled={coolingDown || lock.busy}
          error={!!lock.error}
          onBiometric={lock.biometricOffered ? lock.unlockWithBiometric : undefined}
        />
        <Button
          label={t('lock.unlock')}
          onPress={() => lock.submit(lock.pin)}
          disabled={lock.pin.length < PIN_MIN || coolingDown}
          loading={lock.busy}
          style={{ minWidth: 200 }}
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {lock.staff.length > 1 ? <Button label={t('lock.switchPerson')} variant="ghost" size="sm" onPress={() => lock.choose(null)} /> : null}
          {lock.selected.role === 'owner' ? <Button label={t('lock.forgot')} variant="ghost" size="sm" onPress={() => setForgot(true)} /> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.xl,
        }}
      >
        <AppText variant="headline" tone="secondary" align="center">
          {settings.gym_name || t('common.appName')}
        </AppText>
        {body()}
      </ScrollView>
      <ForgotPinSheet visible={forgot} onClose={() => setForgot(false)} />
    </View>
  );
}
