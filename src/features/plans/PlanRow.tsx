import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Badge, Icon } from '@/components';
import type { PlanWithCount } from '@/db/repositories/plans';
import { formatPaise } from '@/domain/money';
import { useSettings } from '@/store/settingsStore';
import { minTapSize, useTheme } from '@/theme';

import { usePlanLabels } from './usePlanLabels';

export type PlanRowProps = {
  plan: PlanWithCount;
  onPress?: () => void;
  /** Reorder mode: show ↑ ↓ instead of the chevron. */
  reorder?: { onUp?: () => void; onDown?: () => void };
};

function ArrowButton({ icon, label, onPress }: { icon: 'chevron-up' | 'chevron-down'; label: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: minTapSize, height: minTapSize, alignItems: 'center', justifyContent: 'center', opacity: onPress ? 1 : 0.25 }}
    >
      <Icon name={icon} size={22} color={colors.primary} />
    </Pressable>
  );
}

/** One plan: colour badge, name, duration, price, active members (§10.3). */
export function PlanRow({ plan, onPress, reorder }: PlanRowProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code } = useSettings();
  const { summary } = usePlanLabels();

  return (
    <Pressable
      onPress={reorder ? undefined : onPress}
      disabled={!onPress && !reorder}
      accessibilityRole={onPress && !reorder ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: minTapSize + 16,
        backgroundColor: pressed && !reorder ? colors.surfaceMuted : colors.surface,
        opacity: plan.isActive ? 1 : 0.6,
      })}
    >
      <View style={{ width: 12, height: 40, borderRadius: 6, backgroundColor: plan.color ?? colors.primary }} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <AppText variant="headline" numberOfLines={1}>
            {plan.name}
          </AppText>
          {!plan.isActive ? <Badge label={t('plans.inactive')} /> : null}
        </View>
        <AppText variant="footnote" tone="secondary">
          {summary(plan)}
          {plan.admissionFeePaise > 0 ? ` · ${t('plans.plusAdmission', { amount: formatPaise(plan.admissionFeePaise, currency_code) })}` : ''}
        </AppText>
        <AppText variant="footnote" tone="tertiary">
          {t('plans.activeMembers', { count: plan.activeMembers })}
        </AppText>
      </View>
      {reorder ? (
        <View style={{ flexDirection: 'row' }}>
          <ArrowButton icon="chevron-up" label={t('plans.moveUp', { name: plan.name })} onPress={reorder.onUp} />
          <ArrowButton icon="chevron-down" label={t('plans.moveDown', { name: plan.name })} onPress={reorder.onDown} />
        </View>
      ) : (
        <AppText variant="headline">{formatPaise(plan.pricePaise, currency_code)}</AppText>
      )}
    </Pressable>
  );
}
