import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Switch, View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { AppText, BottomSheet, Card, Icon, Input, ListRow, PhoneInput } from '@/components';
import { PinSetup } from '@/features/auth/PinSetup';
import { biometricsAvailable } from '@/services/auth';
import { toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';

import { StepShell } from './StepShell';
import { useOnboardingStore } from './onboardingStore';
import { ownerSchema } from './schemas';
import { useSchemaMessages } from './useSchemaMessages';

type OwnerForm = z.input<ReturnType<typeof ownerSchema>>;

/** Step 3 — owner account: name, phone, PIN twice, optional Face ID (§7). */
export function OwnerStep() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const messages = useSchemaMessages();
  const { owner, setOwner, next, preferences } = useOnboardingStore();
  const schema = useMemo(() => ownerSchema(messages, preferences.countryCode), [messages, preferences.countryCode]);
  const phoneRef = useRef<TextInputInstance>(null);
  const [pinSheet, setPinSheet] = useState(false);
  const [canBiometric, setCanBiometric] = useState(false);

  useEffect(() => {
    void biometricsAvailable().then(setCanBiometric);
  }, []);

  const { control, handleSubmit, formState } = useForm<OwnerForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: owner.name, phone: owner.phone },
  });

  const onNext = handleSubmit((values) => {
    const current = useOnboardingStore.getState().owner;
    if (!current.pin) {
      toast.error(t('onboarding.owner.pinRequired'));
      return;
    }
    setOwner({ ...current, ...schema.parse(values) });
    next();
  });

  return (
    <StepShell title={t('onboarding.owner.title')} subtitle={t('onboarding.owner.subtitle')} onNext={onNext}>
      <View style={{ gap: spacing.md }}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              label={t('onboarding.owner.name')}
              required
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.name?.message}
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneInput
              ref={phoneRef}
              label={t('onboarding.owner.phone')}
              required
              countryCode={preferences.countryCode}
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.phone?.message}
            />
          )}
        />
      </View>

      <View style={{ marginHorizontal: -spacing.lg }}>
        <ListRow
          title={t('onboarding.owner.pin')}
          icon="keypad"
          iconBackground={colors.primary}
          value={owner.pin ? t('onboarding.owner.pinSet') : t('onboarding.owner.pinNotSet')}
          valueTone={owner.pin ? 'success' : 'danger'}
          onPress={() => setPinSheet(true)}
          showChevron
        />
        {canBiometric ? (
          <ListRow
            title={t('onboarding.owner.faceId')}
            subtitle={t('onboarding.owner.faceIdHint')}
            icon="scan"
            iconBackground={colors.info}
            right={
              <Switch
                value={owner.biometric}
                onValueChange={(biometric) => setOwner({ ...useOnboardingStore.getState().owner, biometric })}
                accessibilityLabel={t('onboarding.owner.faceId')}
              />
            }
          />
        ) : null}
      </View>

      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Icon name="warning" size={24} color={colors.warning} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <AppText variant="headline">{t('onboarding.owner.forgotTitle')}</AppText>
            <AppText variant="subhead" tone="secondary">
              {t('onboarding.owner.forgotBody')}
            </AppText>
          </View>
        </View>
      </Card>

      <BottomSheet visible={pinSheet} onClose={() => setPinSheet(false)} title={t('onboarding.owner.pin')}>
        <View style={{ paddingVertical: spacing.lg }}>
          <PinSetup
            onCancel={() => setPinSheet(false)}
            onComplete={(pin) => {
              setOwner({ ...useOnboardingStore.getState().owner, pin });
              setPinSheet(false);
              toast.success(t('onboarding.owner.pinSaved'));
            }}
          />
        </View>
      </BottomSheet>
    </StepShell>
  );
}
