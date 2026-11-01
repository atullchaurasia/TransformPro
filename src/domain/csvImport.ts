// Import members from CSV (spec §10.2): column mapping, per-row validation, duplicates.
// Pure — the screen parses the file, this decides what each row becomes.
import { isValid, parse } from 'date-fns';

import type { Gender, ISODate } from '@/db/models';

import { isValidCode, normalizeCode } from './codes';
import { formatDay } from './dates';
import { parseRupeesToPaise } from './money';
import type { LinePlan } from './newMember';
import { normalizePhone, validatePhone } from './phones';

type DateFormatSetting = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

export const IMPORT_FIELDS = [
  'fullName',
  'phone',
  'altPhone',
  'email',
  'gender',
  'dateOfBirth',
  'joiningDate',
  'memberCode',
  'address',
  'city',
  'pincode',
  'notes',
  'planName',
  'startDate',
  'endDate',
  'amountPaid',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type ColumnMapping = Record<ImportField, number | null>;

/** Header names in the sample template (and what auto-mapping looks for first). */
export const TEMPLATE_HEADERS: Record<ImportField, string> = {
  fullName: 'full_name',
  phone: 'phone',
  altPhone: 'alt_phone',
  email: 'email',
  gender: 'gender',
  dateOfBirth: 'date_of_birth',
  joiningDate: 'joining_date',
  memberCode: 'member_code',
  address: 'address',
  city: 'city',
  pincode: 'pincode',
  notes: 'notes',
  planName: 'plan_name',
  startDate: 'start_date',
  endDate: 'end_date',
  amountPaid: 'amount_paid',
};

const ALIASES: Record<ImportField, string[]> = {
  fullName: ['fullname', 'name', 'membername', 'member'],
  phone: ['phone', 'mobile', 'mobileno', 'phonenumber', 'contact', 'whatsapp'],
  altPhone: ['altphone', 'alternatephone', 'phone2', 'mobile2'],
  email: ['email', 'emailid', 'mail'],
  gender: ['gender', 'sex'],
  dateOfBirth: ['dateofbirth', 'dob', 'birthday', 'birthdate'],
  joiningDate: ['joiningdate', 'joindate', 'joined', 'doj', 'admissiondate'],
  memberCode: ['membercode', 'code', 'memberid', 'id'],
  address: ['address'],
  city: ['city', 'town'],
  pincode: ['pincode', 'pin', 'zip', 'postalcode'],
  notes: ['notes', 'note', 'remarks', 'comments'],
  planName: ['planname', 'plan', 'package', 'membership'],
  startDate: ['startdate', 'start', 'from'],
  endDate: ['enddate', 'end', 'expiry', 'expirydate', 'validtill', 'to'],
  amountPaid: ['amountpaid', 'paid', 'amount', 'payment'],
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Guesses which column holds which field from the header row. */
export function autoMap(headers: string[]): ColumnMapping {
  const used = new Set<number>();
  const out = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, null])) as ColumnMapping;
  for (const field of IMPORT_FIELDS) {
    const wanted = [norm(TEMPLATE_HEADERS[field]), ...ALIASES[field]];
    const idx = headers.findIndex((h, i) => !used.has(i) && wanted.includes(norm(h)));
    if (idx >= 0) {
      out[field] = idx;
      used.add(idx);
    }
  }
  return out;
}

/** YYYY-MM-DD always; otherwise the gym's date format, with / - or . as separator. */
export function parseImportDate(text: string, setting: DateFormatSetting): ISODate | null | 'invalid' {
  const v = text.trim();
  if (!v) return null;
  const tryParse = (pattern: string) => {
    const d = parse(v.replace(/[.-]/g, '/'), pattern, new Date(2000, 0, 1));
    return isValid(d) && d.getFullYear() > 1900 ? formatDay(d) : null;
  };
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(v)) return tryParse('yyyy/M/d') ?? 'invalid';
  const pattern = setting === 'MM/DD/YYYY' ? 'M/d/yyyy' : 'd/M/yyyy';
  return tryParse(pattern) ?? 'invalid';
}

const GENDERS: Record<string, Gender> = { m: 'male', male: 'male', man: 'male', f: 'female', female: 'female', woman: 'female', o: 'other', other: 'other' };

export type ImportError =
  | 'name_required'
  | 'phone_invalid'
  | 'alt_phone_invalid'
  | 'email_invalid'
  | 'gender_invalid'
  | 'date_invalid'
  | 'code_invalid'
  | 'code_taken'
  | 'plan_unknown'
  | 'dates_without_plan'
  | 'end_before_start'
  | 'amount_invalid'
  | 'amount_over_total';

/** Active plans the "plan_name" column can name (matched case-insensitively). */
export type ImportPlan = LinePlan;

export type ImportContext = {
  countryCode: string;
  today: ISODate;
  dateFormat: DateFormatSetting;
  plans: ImportPlan[];
  /** Phones (and alt phones) already in the app, Trash included. */
  existingPhones: Set<string>;
  existingCodes: Set<string>;
  skipDuplicates: boolean;
};

export type ImportedMember = {
  fullName: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  gender: Gender | null;
  dateOfBirth: ISODate | null;
  joiningDate: ISODate;
  memberCode: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  notes: string | null;
};

export type RowResult =
  | { row: number; status: 'ok'; member: ImportedMember; plan: { plan: ImportPlan; startDate: ISODate; endDate: ISODate | null; paidPaise: number } | null }
  | { row: number; status: 'duplicate'; phone: string }
  | { row: number; status: 'error'; errors: { error: ImportError; field: ImportField }[] };

/**
 * Validates every data row (§10.2: "show errors per row"). Phones repeated inside the file
 * count as duplicates too, so one import can't create the same member twice.
 */
export function validateImport(rows: string[][], mapping: ColumnMapping, ctx: ImportContext): RowResult[] {
  const seen = new Set(ctx.existingPhones);
  const codes = new Set([...ctx.existingCodes].map(normalizeCode));
  const plansByName = new Map(ctx.plans.map((p) => [p.name.trim().toLowerCase(), p]));

  return rows.map((cells, i): RowResult => {
    const row = i + 2; // 1-based, after the header row — matches what the owner sees in Excel
    const get = (f: ImportField) => {
      const idx = mapping[f];
      return idx == null ? '' : (cells[idx] ?? '').trim();
    };
    const errors: { error: ImportError; field: ImportField }[] = [];
    const fail = (error: ImportError, field: ImportField) => errors.push({ error, field });
    const date = (f: ImportField) => {
      const d = parseImportDate(get(f), ctx.dateFormat);
      if (d === 'invalid') {
        fail('date_invalid', f);
        return null;
      }
      return d;
    };

    const fullName = get('fullName').replace(/\s+/g, ' ');
    if (!fullName) fail('name_required', 'fullName');
    const phone = normalizePhone(get('phone'), ctx.countryCode);
    if (validatePhone(phone, ctx.countryCode)) fail('phone_invalid', 'phone');
    const altRaw = get('altPhone');
    const altPhone = altRaw ? normalizePhone(altRaw, ctx.countryCode) : null;
    if (altPhone && validatePhone(altPhone, ctx.countryCode)) fail('alt_phone_invalid', 'altPhone');
    const email = get('email') || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('email_invalid', 'email');
    const genderRaw = get('gender').toLowerCase();
    const gender = genderRaw ? (GENDERS[genderRaw] ?? null) : null;
    if (genderRaw && !gender) fail('gender_invalid', 'gender');
    const dateOfBirth = date('dateOfBirth');
    const joiningDate = date('joiningDate') ?? ctx.today;
    const codeRaw = get('memberCode');
    const memberCode = codeRaw ? normalizeCode(codeRaw) : null;
    if (memberCode && !isValidCode(memberCode)) fail('code_invalid', 'memberCode');
    else if (memberCode && codes.has(memberCode)) fail('code_taken', 'memberCode');

    let plan: Extract<RowResult, { status: 'ok' }>['plan'] = null;
    const planName = get('planName');
    const startDate = date('startDate');
    const endDate = date('endDate');
    const paidRaw = get('amountPaid');
    if (planName) {
      const p = plansByName.get(planName.toLowerCase());
      if (!p) fail('plan_unknown', 'planName');
      const start = startDate ?? joiningDate;
      if (endDate && endDate < start) fail('end_before_start', 'endDate');
      const paidPaise = paidRaw ? parseRupeesToPaise(paidRaw) : 0;
      if (paidPaise == null) fail('amount_invalid', 'amountPaid');
      else if (p && paidPaise > p.pricePaise) fail('amount_over_total', 'amountPaid');
      if (p && paidPaise != null) plan = { plan: p, startDate: start, endDate, paidPaise };
    } else if (startDate || endDate || paidRaw) {
      fail('dates_without_plan', 'planName');
    }

    if (errors.length > 0) return { row, status: 'error', errors };
    if (seen.has(phone)) {
      if (ctx.skipDuplicates) return { row, status: 'duplicate', phone };
    }
    seen.add(phone);
    if (memberCode) codes.add(memberCode);
    const opt = (f: ImportField) => get(f) || null;
    return {
      row,
      status: 'ok',
      member: { fullName, phone, altPhone, email, gender, dateOfBirth, joiningDate, memberCode, address: opt('address'), city: opt('city'), pincode: opt('pincode'), notes: opt('notes') },
      plan,
    };
  });
}

/** Sample template (§10.2 "download a sample CSV template"). */
export function sampleCsv(): string {
  const header = IMPORT_FIELDS.map((f) => TEMPLATE_HEADERS[f]).join(',');
  const example = ['Rahul Sharma', '9876543210', '', 'rahul@example.com', 'male', '15/04/1995', '01/10/2026', '', 'MG Road', 'Pune', '411001', 'Morning batch', 'Monthly', '01/10/2026', '', '1500'].join(',');
  return `${header}\n${example}\n`;
}
