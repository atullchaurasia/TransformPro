// Renewal start dates (spec §6.3).
import type { ISODate } from '@/db/models';

import { addDaysISO, computeEndDate, type PlanDuration } from './dates';

export type RenewalInput = {
  /** The subscription being renewed. */
  previous: { id: string; endDate: ISODate };
  today: ISODate;
  duration: PlanDuration;
  /** Expired members only: backdate to the day after expiry, for gyms that charge gap days. */
  startFromExpiry?: boolean;
  /** Owner override of the start date (wins over everything). */
  overrideStartDate?: ISODate | null;
};

export type RenewalPlan = {
  startDate: ISODate;
  endDate: ISODate;
  renewedFromSubscriptionId: string;
  /** True if the previous subscription had already ended before today. */
  wasExpired: boolean;
};

export function planRenewal(input: RenewalInput): RenewalPlan {
  const { previous, today } = input;
  const dayAfterEnd = addDaysISO(previous.endDate, 1);
  const wasExpired = previous.endDate < today;
  // Still running (active / expiring / upcoming): continue the day after it ends, so no
  // paid days are lost. Expired: start today unless the gym charges for the gap.
  const defaultStart = !wasExpired || input.startFromExpiry ? dayAfterEnd : today;
  const startDate = input.overrideStartDate ?? defaultStart;
  return {
    startDate,
    endDate: computeEndDate(startDate, input.duration),
    renewedFromSubscriptionId: previous.id,
    wasExpired,
  };
}
