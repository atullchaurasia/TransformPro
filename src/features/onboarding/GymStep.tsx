import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { AppText, Avatar, Input, PhoneInput } from '@/components';
import { pickPhoto, resolvePhotoUri } from '@/services/photos';
import { toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';

import { StepShell } from './StepShell';
import { useOnboardingStore } from './onboardingStore';
import { gymSchema } from './schemas';
import { useSchemaMessages } from './useSchemaMessages';

type GymForm = z.input<ReturnType<typeof gymSchema>>;

/** Step 2 — gym details (§7). Only the name is required. */
export function GymStep() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const messages = useSchemaMessages();
  const { gym, setGym, next, preferences } = useOnboardingStore();
  const schema = useMemo(() => gymSchema(messages, preferences.countryCode), [messages, preferences.countryCode]);
  const phoneRef = useRef<TextInputInstance>(null);
  const addressRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const gstinRef = useRef<TextInputInstance>(null);

  const { control, handleSubmit, formState } = useForm<GymForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: gym.name, phone: gym.phone, address: gym.address, email: gym.email, gstin: gym.gstin },
  });
  const { errors } = formState;

  const chooseLogo = async () => {
    const result = await pickPhoto('logo');
    if (result.ok) setGym({ ...useOnboardingStore.getState().gym, logoUri: result.uri });
    else if (result.reason === 'permission') toast.error(t('photos.permission'));
    else if (result.reason === 'storage') toast.error(t('photos.storageFull'));
    else if (result.reason === 'failed') toast.error(t('photos.failed'));
  };

  const onNext = handleSubmit((values) => {
    const parsed = schema.parse(values);
    setGym({ ...useOnboardingStore.getState().gym, ...parsed });
    next();
  });

  return (
    <StepShell title={t('onboarding.gym.title')} subtitle={t('onboarding.gym.subtitle')} onNext={onNext}>
      <Pressable
        onPress={chooseLogo}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.gym.logo')}
        style={{ alignItems: 'center', gap: spacing.sm }}
      >
        <Avatar name={gym.name || 'Gym'} uri={resolvePhotoUri(gym.logoUri)} size={88} />
        <AppText variant="subhead" tone="brand">
          {gym.logoUri ? t('onboarding.gym.changeLogo') : t('onboarding.gym.logo')}
        </AppText>
      </Pressable>
      <View style={{ gap: spacing.md }}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              label={t('onboarding.gym.name')}
              required
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.name?.message}
              autoFocus
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
              label={t('onboarding.gym.phone')}
              countryCode={preferences.countryCode}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.phone?.message}
              returnKeyType="next"
              onSubmitEditing={() => addressRef.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <Input ref={addressRef} label={t('onboarding.gym.address')} value={field.value} onChangeText={field.onChange} multiline />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              ref={emailRef}
              label={t('onboarding.gym.email')}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.email?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => gstinRef.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="gstin"
          render={({ field }) => (
            <Input
              ref={gstinRef}
              label={t('onboarding.gym.gstin')}
              helper={t('onboarding.gym.gstinHelp')}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.gstin?.message}
              autoCapitalize="characters"
              maxLength={15}
              returnKeyType="done"
              onSubmitEditing={() => void onNext()}
            />
          )}
        />
      </View>
    </StepShell>
  );
}
