// Forms on the Plans tab (§10.2). Business checks (plan limits, refund caps) come from
// `@/domain/lifecycle` and `@/domain/freeze`; these schemas validate the raw inputs.
import { z } from 'zod';

import type { PaymentMode } from '@/db/models';

export type LifecycleMessages = { required: string; wholeNumber: string; laterDate: string; amount: string };

export function freezeSchema(m: LifecycleMessages) {
  return z
    .object({
      fromDate: z.string().min(1, m.required),
      openEnded: z.boolean(),
      days: z.string().trim(),
      reason: z.string().trim().max(200),
    })
    .superRefine((v, ctx) => {
      if (v.openEnded) return;
      const n = Number(v.days);
      if (!/^\d+$/.test(v.days) || n < 1 || n > 3650) ctx.addIssue({ code: 'custom', path: ['days'], message: m.wholeNumber });
    });
}
export type FreezeFormValues = z.infer<ReturnType<typeof freezeSchema>>;

export function extendSchema(m: LifecycleMessages, currentEnd: string) {
  return z.object({
    endDate: z
      .string()
      .nullable()
      .refine((v) => !!v && v > currentEnd, m.laterDate),
    reason: z.string().trim().min(1, m.required).max(200),
  });
}
export type ExtendFormValues = z.infer<ReturnType<typeof extendSchema>>;

export function cancelSchema(m: LifecycleMessages & { refundTooLarge: string }, maxRefundPaise: number) {
  return z.object({
    reason: z.string().trim().min(1, m.required).max(200),
    refundPaise: z
      .number()
      .int(m.amount)
      .min(0, m.amount)
      .refine((v) => v <= maxRefundPaise, m.refundTooLarge),
    mode: z.custom<PaymentMode>((v) => typeof v === 'string', m.required),
    paidOn: z.string().min(1, m.required),
  });
}
export type CancelFormValues = z.infer<ReturnType<typeof cancelSchema>>;
