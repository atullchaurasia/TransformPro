// Message template placeholders (spec §10.7). Rendering is plain text substitution;
// the user always reviews the message in WhatsApp/SMS before tapping send.
import type { ISODate, Paise } from '@/db/models';
import { formatDate, type DateFormatSetting } from '@/utils/format';

import { formatPaise } from './money';

export const PLACEHOLDERS = [
  'member_name',
  'first_name',
  'member_code',
  'gym_name',
  'gym_phone',
  'plan_name',
  'start_date',
  'expiry_date',
  'days_left',
  'days_since_expiry',
  'due_amount',
  'paid_amount',
  'receipt_no',
  'trainer_name',
  'today',
] as const;

export type Placeholder = (typeof PLACEHOLDERS)[number];
export type TemplateValues = Partial<Record<Placeholder, string>>;

const PLACEHOLDER_RE = /\{([a-z_]+)\}/g;
const isPlaceholder = (key: string): key is Placeholder => (PLACEHOLDERS as readonly string[]).includes(key);

/**
 * Replaces `{placeholder}` tokens. Known placeholders without a value become '' so a
 * member never receives a raw "{due_amount}"; unknown `{words}` are left untouched.
 */
export function renderTemplate(body: string, values: TemplateValues): string {
  return body.replace(PLACEHOLDER_RE, (match, key: string) => (isPlaceholder(key) ? (values[key] ?? '') : match));
}

/** Placeholders a template uses — for the editor's preview and validation. */
export function placeholdersIn(body: string): { known: Placeholder[]; unknown: string[] } {
  const known = new Set<Placeholder>();
  const unknown = new Set<string>();
  for (const [, key] of body.matchAll(PLACEHOLDER_RE)) {
    if (isPlaceholder(key)) known.add(key);
    else unknown.add(key);
  }
  return { known: [...known], unknown: [...unknown] };
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

export type TemplateContext = {
  memberName?: string | null;
  memberCode?: string | null;
  gymName?: string | null;
  gymPhone?: string | null;
  planName?: string | null;
  startDate?: ISODate | null;
  expiryDate?: ISODate | null;
  daysLeft?: number | null;
  daysSinceExpiry?: number | null;
  duePaise?: Paise | null;
  paidPaise?: Paise | null;
  receiptNo?: string | null;
  trainerName?: string | null;
  today: ISODate;
  dateFormat: DateFormatSetting;
  currency: string;
};

/** Builds display-ready values from raw data, using the gym's date format and currency. */
export function buildTemplateValues(ctx: TemplateContext): TemplateValues {
  const text = (v: string | null | undefined) => v ?? '';
  const num = (v: number | null | undefined) => (v == null ? '' : String(v));
  const money = (v: Paise | null | undefined) => (v == null ? '' : formatPaise(v, ctx.currency));
  const date = (v: ISODate | null | undefined) => (v ? formatDate(v, ctx.dateFormat) : '');
  return {
    member_name: text(ctx.memberName),
    first_name: ctx.memberName ? firstName(ctx.memberName) : '',
    member_code: text(ctx.memberCode),
    gym_name: text(ctx.gymName),
    gym_phone: text(ctx.gymPhone),
    plan_name: text(ctx.planName),
    start_date: date(ctx.startDate),
    expiry_date: date(ctx.expiryDate),
    days_left: num(ctx.daysLeft),
    days_since_expiry: num(ctx.daysSinceExpiry),
    due_amount: money(ctx.duePaise),
    paid_amount: money(ctx.paidPaise),
    receipt_no: text(ctx.receiptNo),
    trainer_name: text(ctx.trainerName),
    today: date(ctx.today),
  };
}
