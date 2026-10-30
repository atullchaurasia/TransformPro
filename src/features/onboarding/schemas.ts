// zod schemas for the onboarding forms (§13: every form validated). Messages are passed in
// already translated so the same schema works in English and Hindi.
import { z } from 'zod';

import { normalizePhone, validatePhone } from '@/domain/phones';

/** 15-character Indian GSTIN, e.g. 27AAPFU0939F1ZV. */
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export type SchemaMessages = { required: string; email: string; gstin: string; phone: string; number: string };

const optionalPhone = (countryCode: string, msg: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || validatePhone(normalizePhone(v, countryCode), countryCode) === null, msg);

export function gymSchema(m: SchemaMessages, countryCode = '+91') {
  return z.object({
    name: z.string().trim().min(1, m.required).max(80),
    phone: optionalPhone(countryCode, m.phone),
    address: z.string().trim().max(300),
    email: z.union([z.literal(''), z.email(m.email)]),
    gstin: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => v === '' || GSTIN_RE.test(v), m.gstin),
  });
}

export function ownerSchema(m: SchemaMessages, countryCode = '+91') {
  return z.object({
    name: z.string().trim().min(1, m.required).max(80),
    phone: z
      .string()
      .trim()
      .min(1, m.required)
      .refine((v) => validatePhone(normalizePhone(v, countryCode), countryCode) === null, m.phone),
  });
}

const dayCount = (m: SchemaMessages) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, m.number)
    .refine((v) => Number(v) <= 60, m.number);

export function preferencesSchema(m: SchemaMessages) {
  return z.object({
    currencyCode: z.string().min(1, m.required),
    countryCode: z.string().regex(/^\+\d{1,4}$/, m.required),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
    expiringSoonDays: dayCount(m),
    graceDays: dayCount(m),
  });
}

export function planSchema(m: SchemaMessages) {
  return z.object({
    name: z.string().trim().min(1, m.required).max(60),
    category: z.enum(['membership', 'personal_training', 'service']),
    durationValue: z
      .string()
      .trim()
      .regex(/^\d{1,3}$/, m.number)
      .refine((v) => Number(v) >= 1, m.number),
    durationUnit: z.enum(['days', 'months', 'years']),
  });
}
