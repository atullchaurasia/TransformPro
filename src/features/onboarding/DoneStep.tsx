import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, GroupedSection, Icon, ListRow } from '@/components';
import { formatPaise } from '@/domain/money';
import { toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { StepShell } from './StepShell';
import { finishOnboarding } from './finishOnboarding';
import { useOnboardingStore } from './onboardingStore';

/** Step 7 — summary and "Go to dashboard" (§7). */
export function DoneStep() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { gym, owner, preferences, plans } = useOnboardingStore();
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await finishOnboarding();
      toast.success(t('onboarding.done.saved', { gym: gym.name }));
      // The root layout's route guards switch to the tabs automatically once signed in.
    } catch (e) {
      logger.error('Onboarding failed', e);
      toast.error(t('onboarding.done.failed'));
      setSaving(false);
    }
  };

  return (
    <StepShell title={t('onboarding.done.title')} subtitle={t('onboarding.done.subtitle')} onNext={finish} nextLabel={t('onboarding.done.go')} nextLoading={saving}>
      <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
        <Icon name="checkmark-circle" size={72} color={colors.success} />
      </View>
      <View style={{ marginHorizontal: -spacing.lg }}>
        <GroupedSection>
          <ListRow title={t('onboarding.gym.name')} value={gym.name} />
          <ListRow title={t('onboarding.owner.name')} value={owner.name} />
          <ListRow title={t('onboarding.prefs.currency')} value={preferences.currencyCode} />
          <ListRow title={t('onboarding.done.plans')} value={String(plans.length)} />
          {plans.map((p) => (
            <ListRow key={p.key} title={p.name} value={formatPaise(p.pricePaise, preferences.currencyCode)} />
          ))}
        </GroupedSection>
      </View>
      <AppText variant="footnote" tone="tertiary" align="center">
        {t('onboarding.done.backupHint')}
      </AppText>
    </StepShell>
  );
}
