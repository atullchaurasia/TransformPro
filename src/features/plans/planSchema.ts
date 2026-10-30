// zod schema for the plan form (§5.2 plan fields, §13 validation). Inputs are strings as
// typed; `toPlanInput` converts the parsed form into repository fields.
import { z } from 'zod';

import type { DurationUnit, PlanCategory } from '@/db/models';
import { DEFAULT_SESSION_VALIDITY_DAYS } from '@/domain/dates';

export type PlanFormMessages = { required: string; number: string; amount: string; sessions: string };

const int = (m: PlanFormMessages, min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, m.number)
    .refine((v) => Number(v) >= min && Number(v) <= max, m.number);

export function planFormSchema(m: PlanFormMessages) {
  return z
    .object({
      name: z.string().trim().min(1, m.required).max(60),
      category: z.enum(['membership', 'personal_training', 'service']),
      oneTime: z.boolean(),
      durationValue: z.string().trim(),
      durationUnit: z.enum(['days', 'months', 'years', 'sessions']),
      sessionCount: z.string().trim(),
      pricePaise: z.number().int().min(0, m.amount).nullable(),
      admissionFeePaise: z.number().int().min(0, m.amount).nullable(),
      maxFreezeDays: int(m, 0, 365),
      maxFreezeTimes: int(m, 0, 50),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      description: z.string().trim().max(300),
    })
    .superRefine((v, ctx) => {
      if (v.oneTime) return;
      // Sessions plans: validity days in durationValue (empty = default 90).
      const value = v.durationValue === '' && v.durationUnit === 'sessions' ? String(DEFAULT_SESSION_VALIDITY_DAYS) : v.durationValue;
      if (!/^\d{1,4}$/.test(value) || Number(value) < 1 || Number(value) > 3650) {
        ctx.addIssue({ code: 'custom', path: ['durationValue'], message: m.number });
      }
      if (v.durationUnit === 'sessions' && (!/^\d{1,3}$/.test(v.sessionCount) || Number(v.sessionCount) < 1)) {
        ctx.addIssue({ code: 'custom', path: ['sessionCount'], message: m.sessions });
      }
    });
}

export type PlanFormValues = z.input<ReturnType<typeof planFormSchema>>;

export type PlanInput = {
  name: string;
  category: PlanCategory;
  durationValue: number;
  durationUnit: DurationUnit;
  sessionCount: number | null;
  pricePaise: number;
  admissionFeePaise: number;
  maxFreezeDays: number;
  maxFreezeTimes: number;
  color: string;
  description: string | null;
};

export function toPlanInput(v: PlanFormValues): PlanInput {
  const oneTime = v.oneTime && v.category === 'service';
  const unit: DurationUnit = oneTime ? 'days' : v.durationUnit;
  const durationValue = oneTime
    ? 1
    : unit === 'sessions' && v.durationValue.trim() === ''
      ? DEFAULT_SESSION_VALIDITY_DAYS
      : Number(v.durationValue);
  return {
    name: v.name.trim(),
    category: v.category,
    durationValue,
    durationUnit: unit,
    sessionCount: unit === 'sessions' ? Number(v.sessionCount) : null,
    pricePaise: v.pricePaise ?? 0,
    admissionFeePaise: v.admissionFeePaise ?? 0,
    // Freeze limits only matter for memberships; 0 = no limit (M03 decision).
    maxFreezeDays: Number(v.maxFreezeDays),
    maxFreezeTimes: Number(v.maxFreezeTimes),
    color: v.color.toUpperCase(),
    description: v.description.trim() || null,
  };
}
