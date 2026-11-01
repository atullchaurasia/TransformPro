// Record payment / refund forms (§10.5). Splits and caps are checked by `@/domain/dues`.
import { z } from 'zod';

import type { PaymentMode } from '@/db/models';

export type PaymentFormMessages = { required: string; amount: string };

const MODES = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'] as const satisfies readonly PaymentMode[];

export function paymentFormSchema(m: PaymentFormMessages) {
  return z.object({
    amountPaise: z.number({ error: m.amount }).int(m.amount).positive(m.amount),
    mode: z.enum(MODES),
    reference: z.string().trim().max(60),
    paidOn: z.string().min(1, m.required),
    note: z.string().trim().max(200),
  });
}

export type PaymentFormValues = z.infer<ReturnType<typeof paymentFormSchema>>;
