# TransformPro Spec — Database (spec §5)

> Part of the TransformPro specification. Core rules live in `/CLAUDE.md`; section numbers (§) refer to the original spec — see the index in CLAUDE.md.

## 5. Database

### 5.1 Connection

- File name `transformpro.db` in the default expo-sqlite directory.
- On open: `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`
- Wrap the app in `<SQLiteProvider databaseName="transformpro.db" onInit={migrate}>`.

### 5.2 Schema (migration `001_init`)

Write proper `CREATE TABLE` statements with types, `NOT NULL`, defaults, `CHECK`
constraints, foreign keys and the indexes listed.

**`settings`** — key/value store
- `key TEXT PRIMARY KEY`, `value TEXT NOT NULL` (JSON-encoded)
- Keys include: `gym_name`, `gym_logo_uri`, `gym_address`, `gym_phone`, `gym_email`,
  `gym_gstin`, `currency_code` (default `INR`), `currency_symbol` (`₹`),
  `country_code` (`+91`), `date_format` (`DD/MM/YYYY`), `language` (`en`),
  `expiring_soon_days` (7), `grace_period_days` (0), `member_code_prefix` (`GYM`),
  `next_member_number` (1), `receipt_prefix` (`RCPT`), `next_receipt_number` (1),
  `invoice_terms` (text), `tax_enabled` (false), `tax_percent` (18), `tax_inclusive` (true),
  `default_branch_id`, `checkin_block_expired` (true), `checkin_block_dues` (false),
  `allow_multiple_checkins_per_day` (false), `auto_checkout_hours` (3),
  `lock_enabled`, `lock_after_minutes` (1), `biometric_enabled`,
  `daily_summary_time` ("08:00"), `backup_reminder_days` (7), `last_backup_at`,
  `theme` (`system`|`light`|`dark`), `onboarding_complete` (false),
  `card_design` (`modern`|`classic`|`bold`), `week_start` (`monday`).

**`branches`**
- `id`, `name`, `address`, `phone`, `is_active` (1), `created_at`, `updated_at`
- One default branch created at onboarding. Multi-branch is optional (see §16).

**`staff`** — people who can log into the app on this device
- `id`, `name`, `phone`, `role` (`owner`|`manager`|`receptionist`|`trainer`),
  `pin_hash`, `pin_salt`, `permissions` (JSON array of permission keys, see §15),
  `branch_id` (nullable = all branches), `is_active`, `salary_paise` (nullable),
  `joined_on`, `photo_uri`, `created_at`, `updated_at`, `deleted_at`
- Exactly one `owner` row is created at onboarding. The owner cannot be deleted or demoted.

**`members`**
- `id`, `member_code` (UNIQUE, e.g. `GYM0001`), `branch_id`,
- `full_name` (required), `phone` (required, stored as digits incl. country code e.g. `919876543210`),
  `alt_phone`, `email`, `gender` (`male`|`female`|`other`|null),
  `date_of_birth` (date), `anniversary_date` (date),
- `address`, `area`, `city`, `pincode`, `occupation`,
- `photo_uri` (path inside app documents dir),
- `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relation`,
- `blood_group`, `medical_conditions`, `fitness_goal`
  (`weight_loss`|`muscle_gain`|`general_fitness`|`strength`|`endurance`|`other`),
- `id_proof_type`, `id_proof_number`,
- `height_cm` (real, nullable),
- `joining_date` (date, required),
- `referred_by_member_id` (FK members, nullable), `source` (`walk_in`|`referral`|`instagram`|`facebook`|`google`|`flyer`|`other`),
- `assigned_trainer_id` (FK staff, nullable),
- `notes`,
- `biometric_id` (text, nullable — reserved for future hardware, unused now),
- `created_by` (FK staff), `created_at`, `updated_at`, `deleted_at` (soft delete → Trash)
- Indexes: `phone`, `full_name`, `member_code`, `deleted_at`, `branch_id`.

**`plans`**
- `id`, `name` (e.g. "Monthly", "Quarterly", "PT – 12 sessions"),
- `category` (`membership`|`personal_training`|`service`),
- `duration_value` (int), `duration_unit` (`days`|`months`|`years`|`sessions`),
- `session_count` (int, nullable — for session-based PT/services),
- `price_paise` (int), `admission_fee_paise` (int default 0),
- `max_freeze_days` (int default 0), `max_freeze_times` (int default 0),
- `color` (hex for badges), `description`,
- `is_active` (1), `sort_order`, `created_at`, `updated_at`, `deleted_at`
- Seed on onboarding (editable): Monthly (1 month), Quarterly (3 months),
  Half-Yearly (6 months), Yearly (12 months) with ₹0 price for the owner to fill;
  "Personal Training – Monthly"; services "Locker", "Diet Plan", "Steam Bath".

**`subscriptions`** — one row each time a member buys/renews a plan
- `id`, `member_id` (FK), `plan_id` (FK), `branch_id`,
- `plan_name_snapshot`, `category_snapshot` (keep history correct if plan is edited later),
- `start_date`, `end_date` (inclusive last valid day),
- `sessions_total`, `sessions_used` (for session plans),
- `base_price_paise`, `admission_fee_paise`, `discount_paise`, `discount_reason`,
  `tax_paise`, `total_paise` (= base + admission − discount + tax),
- `trainer_id` (FK staff, nullable — for PT),
- `status` (`active`|`frozen`|`cancelled`|`completed`) — *stored* lifecycle state;
  "expired"/"expiring soon"/"upcoming" are **computed** from dates (see §6.1),
- `frozen_days_total` (int default 0),
- `renewed_from_subscription_id` (FK, nullable),
- `cancelled_reason`, `cancelled_at`, `refund_paise`,
- `created_by`, `created_at`, `updated_at`
- Indexes: `member_id`, `end_date`, `status`, `plan_id`.

**`freezes`**
- `id`, `subscription_id` (FK), `member_id`, `from_date`, `to_date` (nullable while open),
  `days`, `reason`, `created_by`, `created_at`, `ended_at`

**`payments`**
- `id`, `receipt_number` (UNIQUE, e.g. `RCPT00001`), `member_id` (FK), `subscription_id` (FK, nullable),
  `branch_id`, `amount_paise` (int > 0), `mode` (`cash`|`upi`|`card`|`bank_transfer`|`cheque`|`other`),
  `reference` (UPI ref / cheque no), `paid_on` (date), `note`,
  `received_by` (FK staff), `is_refund` (0/1), `created_at`, `updated_at`, `deleted_at`
- Indexes: `member_id`, `paid_on`, `subscription_id`.

**`attendance`**
- `id`, `member_id` (FK), `branch_id`, `date` (date), `check_in_at` (timestamp),
  `check_out_at` (timestamp, nullable), `method` (`manual`|`qr`|`search`),
  `subscription_id` (nullable), `marked_by` (FK staff), `created_at`
- Index: `(member_id, date)`, `date`.

**`staff_attendance`**
- `id`, `staff_id`, `date`, `check_in_at`, `check_out_at`, `note`

**`measurements`**
- `id`, `member_id`, `measured_on` (date), `weight_kg`, `height_cm`, `bmi` (computed on save),
  `body_fat_pct`, `muscle_mass_kg`, `chest_cm`, `waist_cm`, `hips_cm`, `neck_cm`,
  `shoulders_cm`, `biceps_left_cm`, `biceps_right_cm`, `forearm_cm`, `thigh_left_cm`,
  `thigh_right_cm`, `calf_cm`, `resting_hr`, `notes`, `photo_uri` (progress photo),
  `recorded_by`, `created_at`, `updated_at`

**`enquiries`**
- `id`, `name`, `phone`, `email`, `gender`, `age`, `source` (same values as members.source),
  `interested_plan_id` (nullable), `fitness_goal`,
  `status` (`hot`|`warm`|`cold`|`converted`|`lost`),
  `next_follow_up_on` (date, nullable), `trial_date` (nullable), `notes`,
  `assigned_to` (FK staff), `converted_member_id` (FK members, nullable), `lost_reason`,
  `created_at`, `updated_at`, `deleted_at`

**`enquiry_followups`**
- `id`, `enquiry_id`, `followed_up_on` (timestamp), `channel` (`call`|`whatsapp`|`sms`|`visit`),
  `outcome` (text), `next_follow_up_on`, `status_after`, `staff_id`, `created_at`

**`expense_categories`**
- `id`, `name`, `icon`, `is_active` — seed: Rent, Electricity, Water, Staff Salary,
  Equipment Purchase, Equipment Repair, Cleaning & Housekeeping, Marketing,
  Internet & Phone, Supplements Stock, Maintenance, Miscellaneous.

**`expenses`**
- `id`, `branch_id`, `category_id`, `amount_paise`, `spent_on` (date),
  `mode` (same as payments), `paid_to`, `note`, `receipt_photo_uri`,
  `is_recurring` (0/1), `recur_every` (`monthly`|null), `created_by`, `created_at`, `updated_at`, `deleted_at`

**`message_templates`**
- `id`, `key` (unique for system templates), `title`, `body`, `category`
  (`expiry_reminder`|`expired`|`dues`|`birthday`|`anniversary`|`welcome`|`renewal_thanks`|`payment_receipt`|`absent`|`enquiry_followup`|`festival`|`custom`),
  `is_system` (system ones can be edited but not deleted), `created_at`, `updated_at`

**`message_log`**
- `id`, `member_id` (nullable), `enquiry_id` (nullable), `template_id`, `channel`
  (`whatsapp`|`sms`|`call`|`email`), `body_sent`, `sent_at`, `sent_by`

**`audit_log`**
- `id`, `staff_id`, `action` (e.g. `member.create`, `payment.delete`), `entity`, `entity_id`,
  `summary` (human readable), `created_at`
- Log every create/update/delete of members, subscriptions, payments, expenses, staff,
  settings changes, backup/restore, and login/logout.

### 5.3 Migrations

- `src/db/migrations/NNN_name.ts` each export `{ version: number, up: (db) => Promise<void> }`.
- `migrate.ts` reads `PRAGMA user_version`, runs every migration with a higher version in
  order **inside a transaction**, then sets `PRAGMA user_version = N`.
- **Never edit a migration that has shipped.** Add a new one.
- Before running any migration on an existing DB with data, **automatically create a local
  safety backup** (copy of the DB file) in `Documents/auto-backups/`.
