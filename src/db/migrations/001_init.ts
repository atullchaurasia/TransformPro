import type { Migration } from './types';

// Full schema from spec §5.2. Conventions (CLAUDE.md §4):
//  - ids are TEXT UUIDs; money is INTEGER paise; booleans are INTEGER 0/1
//  - dates are TEXT 'YYYY-MM-DD' (checked by GLOB); timestamps are full ISO TEXT
//  - every table has created_at / updated_at; soft-deleted tables have deleted_at
//  - member-owned rows CASCADE on permanent member delete (Trash → delete permanently)

const DATE = (col: string) => `${col} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`;
const OPT_DATE = (col: string) => `(${col} IS NULL OR ${DATE(col)})`;
const BOOL = (col: string) => `${col} IN (0, 1)`;
const PAYMENT_MODES = `('cash','upi','card','bank_transfer','cheque','other')`;
const SOURCES = `('walk_in','referral','instagram','facebook','google','flyer','other')`;
const GOALS = `('weight_loss','muscle_gain','general_fitness','strength','endurance','other')`;
const GENDERS = `('male','female','other')`;
const TS = `created_at TEXT NOT NULL, updated_at TEXT NOT NULL`;

const SQL = `
CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  ${TS}
);

CREATE TABLE branches (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  address TEXT,
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (${BOOL('is_active')}),
  ${TS}
);

CREATE TABLE staff (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','receptionist','trainer')),
  pin_hash TEXT,
  pin_salt TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  branch_id TEXT REFERENCES branches(id),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (${BOOL('is_active')}),
  salary_paise INTEGER CHECK (salary_paise IS NULL OR salary_paise >= 0),
  joined_on TEXT CHECK ${OPT_DATE('joined_on')},
  photo_uri TEXT,
  ${TS},
  deleted_at TEXT
);
-- Exactly one owner, who can never be deleted or demoted (spec §5.2).
CREATE UNIQUE INDEX ux_staff_single_owner ON staff(role) WHERE role = 'owner';

CREATE TABLE members (
  id TEXT PRIMARY KEY NOT NULL,
  member_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  branch_id TEXT REFERENCES branches(id),
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) > 0),
  phone TEXT NOT NULL CHECK (length(phone) >= 6),
  alt_phone TEXT,
  email TEXT,
  gender TEXT CHECK (gender IS NULL OR gender IN ${GENDERS}),
  date_of_birth TEXT CHECK ${OPT_DATE('date_of_birth')},
  anniversary_date TEXT CHECK ${OPT_DATE('anniversary_date')},
  address TEXT,
  area TEXT,
  city TEXT,
  pincode TEXT,
  occupation TEXT,
  photo_uri TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  blood_group TEXT,
  medical_conditions TEXT,
  fitness_goal TEXT CHECK (fitness_goal IS NULL OR fitness_goal IN ${GOALS}),
  id_proof_type TEXT,
  id_proof_number TEXT,
  height_cm REAL CHECK (height_cm IS NULL OR height_cm > 0),
  joining_date TEXT NOT NULL CHECK (${DATE('joining_date')}),
  referred_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  source TEXT CHECK (source IS NULL OR source IN ${SOURCES}),
  assigned_trainer_id TEXT REFERENCES staff(id),
  notes TEXT,
  biometric_id TEXT,
  created_by TEXT REFERENCES staff(id),
  ${TS},
  deleted_at TEXT
);
CREATE INDEX ix_members_phone ON members(phone);
CREATE INDEX ix_members_full_name ON members(full_name COLLATE NOCASE);
CREATE INDEX ix_members_deleted_at ON members(deleted_at);
CREATE INDEX ix_members_branch_id ON members(branch_id);
CREATE INDEX ix_members_trainer ON members(assigned_trainer_id);
CREATE INDEX ix_members_referred_by ON members(referred_by_member_id);

CREATE TABLE plans (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  category TEXT NOT NULL CHECK (category IN ('membership','personal_training','service')),
  duration_value INTEGER NOT NULL CHECK (duration_value > 0),
  duration_unit TEXT NOT NULL CHECK (duration_unit IN ('days','months','years','sessions')),
  session_count INTEGER CHECK (session_count IS NULL OR session_count > 0),
  price_paise INTEGER NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
  admission_fee_paise INTEGER NOT NULL DEFAULT 0 CHECK (admission_fee_paise >= 0),
  max_freeze_days INTEGER NOT NULL DEFAULT 0 CHECK (max_freeze_days >= 0),
  max_freeze_times INTEGER NOT NULL DEFAULT 0 CHECK (max_freeze_times >= 0),
  color TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (${BOOL('is_active')}),
  sort_order INTEGER NOT NULL DEFAULT 0,
  ${TS},
  deleted_at TEXT
);
CREATE INDEX ix_plans_category ON plans(category, sort_order);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  branch_id TEXT REFERENCES branches(id),
  plan_name_snapshot TEXT NOT NULL,
  category_snapshot TEXT NOT NULL CHECK (category_snapshot IN ('membership','personal_training','service')),
  start_date TEXT NOT NULL CHECK (${DATE('start_date')}),
  end_date TEXT NOT NULL CHECK (${DATE('end_date')}),
  sessions_total INTEGER CHECK (sessions_total IS NULL OR sessions_total > 0),
  sessions_used INTEGER NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  base_price_paise INTEGER NOT NULL DEFAULT 0 CHECK (base_price_paise >= 0),
  admission_fee_paise INTEGER NOT NULL DEFAULT 0 CHECK (admission_fee_paise >= 0),
  discount_paise INTEGER NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  discount_reason TEXT,
  tax_paise INTEGER NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  total_paise INTEGER NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  trainer_id TEXT REFERENCES staff(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','cancelled','completed')),
  frozen_days_total INTEGER NOT NULL DEFAULT 0 CHECK (frozen_days_total >= 0),
  renewed_from_subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  cancelled_reason TEXT,
  cancelled_at TEXT,
  refund_paise INTEGER CHECK (refund_paise IS NULL OR refund_paise >= 0),
  created_by TEXT REFERENCES staff(id),
  ${TS},
  CHECK (end_date >= start_date),
  CHECK (sessions_total IS NULL OR sessions_used <= sessions_total)
);
CREATE INDEX ix_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX ix_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX ix_subscriptions_status ON subscriptions(status);
CREATE INDEX ix_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX ix_subscriptions_trainer_id ON subscriptions(trainer_id);

CREATE TABLE freezes (
  id TEXT PRIMARY KEY NOT NULL,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  from_date TEXT NOT NULL CHECK (${DATE('from_date')}),
  to_date TEXT CHECK ${OPT_DATE('to_date')},
  days INTEGER CHECK (days IS NULL OR days > 0),
  reason TEXT,
  created_by TEXT REFERENCES staff(id),
  ended_at TEXT,
  ${TS},
  CHECK (to_date IS NULL OR to_date >= from_date)
);
CREATE INDEX ix_freezes_subscription_id ON freezes(subscription_id);
CREATE INDEX ix_freezes_member_id ON freezes(member_id);

CREATE TABLE payments (
  id TEXT PRIMARY KEY NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES subscriptions(id),
  branch_id TEXT REFERENCES branches(id),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  mode TEXT NOT NULL CHECK (mode IN ${PAYMENT_MODES}),
  reference TEXT,
  paid_on TEXT NOT NULL CHECK (${DATE('paid_on')}),
  note TEXT,
  received_by TEXT REFERENCES staff(id),
  is_refund INTEGER NOT NULL DEFAULT 0 CHECK (${BOOL('is_refund')}),
  ${TS},
  deleted_at TEXT
);
CREATE INDEX ix_payments_member_id ON payments(member_id);
CREATE INDEX ix_payments_paid_on ON payments(paid_on);
CREATE INDEX ix_payments_subscription_id ON payments(subscription_id);
CREATE INDEX ix_payments_received_by ON payments(received_by);

CREATE TABLE attendance (
  id TEXT PRIMARY KEY NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id),
  date TEXT NOT NULL CHECK (${DATE('date')}),
  check_in_at TEXT NOT NULL,
  check_out_at TEXT,
  method TEXT NOT NULL CHECK (method IN ('manual','qr','search')),
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  marked_by TEXT REFERENCES staff(id),
  ${TS},
  CHECK (check_out_at IS NULL OR check_out_at >= check_in_at)
);
CREATE INDEX ix_attendance_member_date ON attendance(member_id, date);
CREATE INDEX ix_attendance_date ON attendance(date);
CREATE INDEX ix_attendance_open ON attendance(check_out_at) WHERE check_out_at IS NULL;

CREATE TABLE staff_attendance (
  id TEXT PRIMARY KEY NOT NULL,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  date TEXT NOT NULL CHECK (${DATE('date')}),
  check_in_at TEXT NOT NULL,
  check_out_at TEXT,
  note TEXT,
  ${TS},
  CHECK (check_out_at IS NULL OR check_out_at >= check_in_at)
);
CREATE INDEX ix_staff_attendance_staff_date ON staff_attendance(staff_id, date);

CREATE TABLE measurements (
  id TEXT PRIMARY KEY NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  measured_on TEXT NOT NULL CHECK (${DATE('measured_on')}),
  weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg > 0),
  height_cm REAL CHECK (height_cm IS NULL OR height_cm > 0),
  bmi REAL CHECK (bmi IS NULL OR bmi > 0),
  body_fat_pct REAL CHECK (body_fat_pct IS NULL OR (body_fat_pct >= 0 AND body_fat_pct <= 100)),
  muscle_mass_kg REAL CHECK (muscle_mass_kg IS NULL OR muscle_mass_kg > 0),
  chest_cm REAL, waist_cm REAL, hips_cm REAL, neck_cm REAL, shoulders_cm REAL,
  biceps_left_cm REAL, biceps_right_cm REAL, forearm_cm REAL,
  thigh_left_cm REAL, thigh_right_cm REAL, calf_cm REAL,
  resting_hr INTEGER CHECK (resting_hr IS NULL OR resting_hr > 0),
  notes TEXT,
  photo_uri TEXT,
  recorded_by TEXT REFERENCES staff(id),
  ${TS}
);
CREATE INDEX ix_measurements_member ON measurements(member_id, measured_on);

CREATE TABLE enquiries (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  phone TEXT NOT NULL CHECK (length(phone) >= 6),
  email TEXT,
  gender TEXT CHECK (gender IS NULL OR gender IN ${GENDERS}),
  age INTEGER CHECK (age IS NULL OR (age > 0 AND age < 120)),
  source TEXT CHECK (source IS NULL OR source IN ${SOURCES}),
  interested_plan_id TEXT REFERENCES plans(id),
  fitness_goal TEXT CHECK (fitness_goal IS NULL OR fitness_goal IN ${GOALS}),
  status TEXT NOT NULL DEFAULT 'warm' CHECK (status IN ('hot','warm','cold','converted','lost')),
  next_follow_up_on TEXT CHECK ${OPT_DATE('next_follow_up_on')},
  -- 'HH:mm' local time for the follow-up reminder (spec §10.9 "date+time"); see Decisions Log.
  next_follow_up_time TEXT CHECK (next_follow_up_time IS NULL OR next_follow_up_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  trial_date TEXT CHECK ${OPT_DATE('trial_date')},
  notes TEXT,
  assigned_to TEXT REFERENCES staff(id),
  converted_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  lost_reason TEXT,
  ${TS},
  deleted_at TEXT
);
CREATE INDEX ix_enquiries_status ON enquiries(status);
CREATE INDEX ix_enquiries_follow_up ON enquiries(next_follow_up_on);
CREATE INDEX ix_enquiries_phone ON enquiries(phone);
CREATE INDEX ix_enquiries_deleted_at ON enquiries(deleted_at);

CREATE TABLE enquiry_followups (
  id TEXT PRIMARY KEY NOT NULL,
  enquiry_id TEXT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  followed_up_on TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('call','whatsapp','sms','visit')),
  outcome TEXT,
  next_follow_up_on TEXT CHECK ${OPT_DATE('next_follow_up_on')},
  status_after TEXT CHECK (status_after IS NULL OR status_after IN ('hot','warm','cold','converted','lost')),
  staff_id TEXT REFERENCES staff(id),
  ${TS}
);
CREATE INDEX ix_enquiry_followups_enquiry ON enquiry_followups(enquiry_id);

CREATE TABLE expense_categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(name)) > 0),
  icon TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (${BOOL('is_active')}),
  ${TS}
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY NOT NULL,
  branch_id TEXT REFERENCES branches(id),
  category_id TEXT NOT NULL REFERENCES expense_categories(id),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  spent_on TEXT NOT NULL CHECK (${DATE('spent_on')}),
  mode TEXT NOT NULL CHECK (mode IN ${PAYMENT_MODES}),
  paid_to TEXT,
  note TEXT,
  receipt_photo_uri TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0 CHECK (${BOOL('is_recurring')}),
  recur_every TEXT CHECK (recur_every IS NULL OR recur_every = 'monthly'),
  created_by TEXT REFERENCES staff(id),
  ${TS},
  deleted_at TEXT
);
CREATE INDEX ix_expenses_spent_on ON expenses(spent_on);
CREATE INDEX ix_expenses_category ON expenses(category_id);

CREATE TABLE message_templates (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT,
  -- Templates are per language (spec §11); system templates are seeded in EN and HI.
  language TEXT NOT NULL DEFAULT 'en' CHECK (length(language) BETWEEN 2 AND 5),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('expiry_reminder','expired','dues','birthday','anniversary','welcome','renewal_thanks','payment_receipt','absent','enquiry_followup','festival','custom')),
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (${BOOL('is_system')}),
  ${TS}
);
CREATE UNIQUE INDEX ux_message_templates_key_lang ON message_templates(key, language) WHERE key IS NOT NULL;

CREATE TABLE message_log (
  id TEXT PRIMARY KEY NOT NULL,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  enquiry_id TEXT REFERENCES enquiries(id) ON DELETE SET NULL,
  template_id TEXT REFERENCES message_templates(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','call','email')),
  body_sent TEXT,
  sent_at TEXT NOT NULL,
  sent_by TEXT REFERENCES staff(id),
  ${TS}
);
CREATE INDEX ix_message_log_member ON message_log(member_id, sent_at);
CREATE INDEX ix_message_log_sent_at ON message_log(sent_at);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  staff_id TEXT REFERENCES staff(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  ${TS}
);
CREATE INDEX ix_audit_log_created_at ON audit_log(created_at);
CREATE INDEX ix_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX ix_audit_log_staff ON audit_log(staff_id);
`;

export const migration001Init: Migration = {
  version: 1,
  name: 'init',
  up: (db) => db.execAsync(SQL),
};
