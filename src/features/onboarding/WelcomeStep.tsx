import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, SegmentedControl } from '@/components';
import { usePreferencesStore, type LanguageCode } from '@/store/preferencesStore';
import { useTheme } from '@/theme';

import { StepShell } from './StepShell';
import { useOnboardingStore } from './onboardingStore';

/** Step 1 — welcome, "your data stays on this iPhone", language (§7). */
export function WelcomeStep() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { language, setLanguage } = usePreferencesStore();
  const next = useOnboardingStore((s) => s.next);

  return (
    <StepShell title={t('onboarding.welcome.title')} subtitle={t('onboarding.welcome.subtitle')} onNext={next} nextLabel={t('onboarding.welcome.start')}>
      <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <View style={{ width: 96, height: 96, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="barbell" size={56} color={colors.onPrimary} />
        </View>
      </View>
      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Icon name="phone-portrait-outline" size={28} color={colors.primary} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <AppText variant="headline">{t('onboarding.welcome.offlineTitle')}</AppText>
            <AppText variant="subhead" tone="secondary">
              {t('onboarding.welcome.offlineBody')}
            </AppText>
          </View>
        </View>
      </Card>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="footnote" tone="secondary" weight="600">
          {t('language.title')}
        </AppText>
        <SegmentedControl<LanguageCode>
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'en', label: 'English' },
            { value: 'hi', label: 'हिन्दी' },
          ]}
        />
      </View>
    </StepShell>
  );
}
