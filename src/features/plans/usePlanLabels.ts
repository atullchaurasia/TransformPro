import { useTranslation } from 'react-i18next';

import type { DurationUnit, PlanCategory } from '@/db/models';
import { isOneTime, type PlanShape } from '@/domain/plans';

/** "3 months", "1 day", "Membership"… — shared by onboarding and the Plans screens. */
export function usePlanLabels() {
  const { t } = useTranslation();
  const duration = (value: number, unit: DurationUnit) => t(`plans.duration.${unit}`, { count: value });
  return {
    duration,
    category: (c: PlanCategory) => t(`plans.category.${c}`),
    /** "3 months" · "12 sessions · valid 90 days" · "One-time". */
    summary: (plan: PlanShape) => {
      if (isOneTime(plan)) return t('plans.oneTime');
      if (plan.durationUnit === 'sessions') {
        return t('plans.sessionsSummary', { sessions: duration(plan.sessionCount ?? 1, 'sessions'), days: plan.durationValue });
      }
      return duration(plan.durationValue, plan.durationUnit);
    },
  };
}
