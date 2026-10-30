import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon } from '@/components';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { useTheme } from '@/theme';

import { StepShell } from './StepShell';
import { useOnboardingStore } from './onboardingStore';

/** Step 6 — "Already have a backup? Restore it" (§7). */
export function RestoreStep() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const next = useOnboardingStore((s) => s.next);

  return (
    <StepShell title={t('onboarding.restore.title')} subtitle={t('onboarding.restore.subtitle')} onNext={next} nextLabel={t('onboarding.restore.startFresh')}>
      <Card>
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <Icon name="cloud-download-outline" size={44} color={colors.primary} />
          <AppText variant="headline" align="center">
            {t('onboarding.restore.cardTitle')}
          </AppText>
          <AppText variant="subhead" tone="secondary" align="center">
            {t('onboarding.restore.cardBody')}
          </AppText>
          {/* TODO(M11): open the real restore flow (pick a .transformpro file → restore → reload). */}
          <Button
            label={t('onboarding.restore.button')}
            icon="folder-open-outline"
            variant="secondary"
            onPress={() => openComingSoon('M11', t('onboarding.restore.button'))}
          />
        </View>
      </Card>
    </StepShell>
  );
}
