import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, FormScreen } from '@/components';
import { useTheme } from '@/theme';

import { STEP_COUNT, useOnboardingStore } from './onboardingStore';

function ProgressDots({ step }: { step: number }) {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}
      accessibilityLabel={t('onboarding.progress', { step: step + 1, total: STEP_COUNT })}
    >
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <View
          key={i}
          style={{ width: i === step ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? colors.primary : colors.border }}
        />
      ))}
    </View>
  );
}

export type StepShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  nextLabel?: string;
  nextLoading?: boolean;
  /** Hidden on the first step. */
  showBack?: boolean;
};

/** Frame for every onboarding step: progress dots, title, content, Back / Next (§7). */
export function StepShell({ title, subtitle, children, onNext, nextLabel, nextLoading, showBack = true }: StepShellProps) {
  const { t } = useTranslation();
  const { spacing, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { step, back } = useOnboardingStore();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.md }}>
      <ProgressDots step={step} />
      <FormScreen>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="title1">{title}</AppText>
          {subtitle ? (
            <AppText variant="callout" tone="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {children}
      </FormScreen>
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.separator,
          backgroundColor: colors.background,
        }}
      >
        {showBack && step > 0 ? <Button label={t('common.back')} variant="secondary" onPress={back} style={{ flex: 1 }} /> : null}
        <Button label={nextLabel ?? t('common.next')} onPress={onNext} loading={nextLoading} style={{ flex: 2 }} />
      </View>
    </View>
  );
}
