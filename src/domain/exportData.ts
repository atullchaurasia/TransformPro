// Export columns (spec §10.16). Pure: raw rows in, spreadsheet cells out. Money becomes
// rupees (numbers, so Excel can sum them); dates use the gym's date format.
export const DATASETS = ['members', 'payments', 'attendance', 'expenses', 'enquiries', 'measurements'] as const;
export type Dataset = (typeof DATASETS)[number];

export type Cell = string | number | null;
type Raw = Record<string, unknown>;

export type ExportFormat = {
  date: (iso: string) => string;
  dateTime: (iso: string) => string;
  /** Translated enum labels (gender, payment mode, status…). */
  label: (group: string, value: string) => string;
};

type Column = { key: string; value: (r: Raw, f: ExportFormat) => Cell };

const s = (v: unknown): Cell => (v == null || v === '' ? null : String(v));
const n = (v: unknown): Cell => (v == null || v === '' ? null : Number(v));
const rupees = (v: unknown): Cell => (v == null ? null : Math.round(Number(v)) / 100);
const day = (k: string): Column['value'] => (r, f) => (r[k] ? f.date(String(r[k])) : null);
const when = (k: string): Column['value'] => (r, f) => (r[k] ? f.dateTime(String(r[k])) : null);
const col = (key: string, value: Column['value'] = (r) => s(r[key])): Column => ({ key, value });
const label = (key: string, group: string): Column => ({ key, value: (r, f) => (r[key] ? f.label(group, String(r[key])) : null) });

export const COLUMNS: Record<Dataset, Column[]> = {
  members: [
    col('member_code'),
    col('full_name'),
    col('phone'),
    col('alt_phone'),
    col('email'),
    label('gender', 'gender'),
    col('date_of_birth', day('date_of_birth')),
    col('anniversary_date', day('anniversary_date')),
    col('joining_date', day('joining_date')),
    col('address'),
    col('area'),
    col('city'),
    col('pincode'),
    col('occupation'),
    col('blood_group'),
    col('height_cm', (r) => n(r.height_cm)),
    col('medical_conditions'),
    label('fitness_goal', 'goal'),
    col('emergency_contact_name'),
    col('emergency_contact_phone'),
    col('emergency_contact_relation'),
    label('source', 'source'),
    col('trainer_name'),
    col('notes'),
  ],
  payments: [
    col('receipt_number'),
    col('paid_on', day('paid_on')),
    col('member_code'),
    col('full_name'),
    col('plan_name'),
    col('kind', (r, f) => f.label('kind', Number(r.is_refund) ? 'refund' : 'payment')),
    col('amount', (r) => rupees(Number(r.is_refund) ? -Number(r.amount_paise) : r.amount_paise)),
    label('mode', 'mode'),
    col('reference'),
    col('note'),
    col('staff_name'),
  ],
  attendance: [col('date', day('date')), col('member_code'), col('full_name'), col('check_in_at', when('check_in_at')), col('check_out_at', when('check_out_at')), label('method', 'method')],
  expenses: [col('spent_on', day('spent_on')), col('category'), col('amount', (r) => rupees(r.amount_paise)), label('mode', 'mode'), col('paid_to'), col('note')],
  enquiries: [
    col('created_on', day('created_on')),
    col('name'),
    col('phone'),
    label('status', 'enquiryStatus'),
    label('source', 'source'),
    col('next_follow_up_on', day('next_follow_up_on')),
    col('notes'),
  ],
  measurements: [
    col('measured_on', day('measured_on')),
    col('member_code'),
    col('full_name'),
    ...['weight_kg', 'height_cm', 'bmi', 'body_fat_pct', 'muscle_mass_kg', 'chest_cm', 'waist_cm', 'hips_cm', 'biceps_left_cm', 'biceps_right_cm', 'thigh_left_cm', 'thigh_right_cm'].map((k) => col(k, (r) => n(r[k]))),
    col('notes'),
  ],
};

/** Header row + data rows for one sheet. `header(key)` translates column names. */
export function toSheet(dataset: Dataset, rows: Raw[], f: ExportFormat, header: (key: string) => string): Cell[][] {
  const cols = COLUMNS[dataset];
  return [cols.map((c) => header(c.key)), ...rows.map((r) => cols.map((c) => c.value(r, f)))];
}

/** Which date column a dataset's date range filters on. */
export const RANGE_COLUMN: Record<Dataset, string> = {
  members: 'joining_date',
  payments: 'paid_on',
  attendance: 'date',
  expenses: 'spent_on',
  enquiries: 'created_on',
  measurements: 'measured_on',
};
