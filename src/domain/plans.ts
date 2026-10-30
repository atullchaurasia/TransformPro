// How a plan's columns map to durations (spec §5.2 plans, §6.2, §10.3).
// Storage rules (Decisions Log 2026-10-30 M05):
// - days / months / years: `duration_value` = the length.
// - sessions: `session_count` = number of sessions, `duration_value` = validity in days.
// - One-time service = a service with 1 day (`days`, 1); shown as "One-time".
import type { DurationUnit, Plan, PlanCategory } from '@/db/models';

import { DEFAULT_SESSION_VALIDITY_DAYS, type PlanDuration } from './dates';

export type PlanShape = Pick<Plan, 'category' | 'durationValue' | 'durationUnit' | 'sessionCount'>;

/** What `computeEndDate` needs for this plan. */
export function planDuration(plan: PlanShape): PlanDuration {
  if (plan.durationUnit === 'sessions') {
    return { unit: 'sessions', value: plan.sessionCount ?? 1, validityDays: plan.durationValue || DEFAULT_SESSION_VALIDITY_DAYS };
  }
  return { unit: plan.durationUnit, value: plan.durationValue };
}

export function isOneTime(plan: PlanShape): boolean {
  return plan.category === 'service' && plan.durationUnit === 'days' && plan.durationValue === 1;
}

/** Sessions a new subscription to this plan starts with (null = not session-based). */
export function planSessions(plan: PlanShape): number | null {
  return plan.durationUnit === 'sessions' ? (plan.sessionCount ?? null) : null;
}

export const PLAN_CATEGORIES: PlanCategory[] = ['membership', 'personal_training', 'service'];
export const DURATION_UNITS: DurationUnit[] = ['days', 'months', 'years', 'sessions'];

/** Sort order for a category list: explicit order first, then name. */
export function sortPlans<T extends Pick<Plan, 'sortOrder' | 'name'>>(plans: T[]): T[] {
  return [...plans].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/**
 * Moving a plan up/down swaps its position with the neighbour and renumbers the whole
 * category 0…n−1, so ties left by old data are cleaned up. Returns id → new sort_order.
 */
export function reorderPlans<T extends Pick<Plan, 'id' | 'sortOrder' | 'name'>>(plans: T[], id: string, direction: 'up' | 'down'): Map<string, number> {
  const ordered = sortPlans(plans);
  const i = ordered.findIndex((p) => p.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i >= 0 && j >= 0 && j < ordered.length) {
    const a = ordered[i];
    const b = ordered[j];
    if (a && b) {
      ordered[i] = b;
      ordered[j] = a;
    }
  }
  return new Map(ordered.map((p, index) => [p.id, index]));
}
