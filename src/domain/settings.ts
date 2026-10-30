// Typed app settings with defaults for every key in spec §5.2. The DB stores JSON values
// per key; anything missing or of the wrong type falls back to the default here, so a
// half-written or older backup can never crash the app.
import type { DateFormatSetting } from '@/utils/format';

export type ThemeSetting = 'system' | 'light' | 'dark';
export type LanguageSetting = 'en' | 'hi';
export type CardDesign = 'modern' | 'classic' | 'bold';
export type WeekStart = 'monday' | 'sunday';

export type AppSettings = {
  gym_name: string;
  gym_logo_uri: string | null;
  gym_address: string;
  gym_phone: string;
  gym_email: string;
  gym_gstin: string;
  currency_code: string;
  currency_symbol: string;
  country_code: string;
  date_format: DateFormatSetting;
  language: LanguageSetting;
  expiring_soon_days: number;
  grace_period_days: number;
  member_code_prefix: string;
  next_member_number: number;
  receipt_prefix: string;
  next_receipt_number: number;
  invoice_terms: string;
  tax_enabled: boolean;
  tax_percent: number;
  tax_inclusive: boolean;
  default_branch_id: string | null;
  checkin_block_expired: boolean;
  checkin_block_dues: boolean;
  allow_multiple_checkins_per_day: boolean;
  auto_checkout_hours: number;
  lock_enabled: boolean;
  lock_after_minutes: number;
  biometric_enabled: boolean;
  daily_summary_time: string;
  backup_reminder_days: number;
  last_backup_at: string | null;
  theme: ThemeSetting;
  onboarding_complete: boolean;
  card_design: CardDesign;
  week_start: WeekStart;
  /** §10.2 Trash: auto-purge items older than 30 days on app open (setting to disable). */
  trash_auto_purge: boolean;
};

export type SettingKey = keyof AppSettings;

export const SETTINGS_DEFAULTS: AppSettings = {
  gym_name: '',
  gym_logo_uri: null,
  gym_address: '',
  gym_phone: '',
  gym_email: '',
  gym_gstin: '',
  currency_code: 'INR',
  currency_symbol: '₹',
  country_code: '+91',
  date_format: 'DD/MM/YYYY',
  language: 'en',
  expiring_soon_days: 7,
  grace_period_days: 0,
  member_code_prefix: 'GYM',
  next_member_number: 1,
  receipt_prefix: 'RCPT',
  next_receipt_number: 1,
  invoice_terms: '',
  tax_enabled: false,
  tax_percent: 18,
  tax_inclusive: true,
  default_branch_id: null,
  checkin_block_expired: true,
  checkin_block_dues: false,
  allow_multiple_checkins_per_day: false,
  auto_checkout_hours: 3,
  // Onboarding always creates an owner PIN, so the lock is on unless the owner turns it off.
  lock_enabled: true,
  lock_after_minutes: 1,
  biometric_enabled: false,
  daily_summary_time: '08:00',
  backup_reminder_days: 7,
  last_backup_at: null,
  theme: 'system',
  onboarding_complete: false,
  card_design: 'modern',
  week_start: 'monday',
  trash_auto_purge: true,
};

export const SETTING_KEYS = Object.keys(SETTINGS_DEFAULTS) as SettingKey[];

const ENUMS: Partial<Record<SettingKey, readonly string[]>> = {
  date_format: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
  language: ['en', 'hi'],
  theme: ['system', 'light', 'dark'],
  card_design: ['modern', 'classic', 'bold'],
  week_start: ['monday', 'sunday'],
};

const NULLABLE = new Set<SettingKey>(['gym_logo_uri', 'default_branch_id', 'last_backup_at']);

/** Integer settings and their allowed range. */
const RANGES: Partial<Record<SettingKey, [number, number]>> = {
  expiring_soon_days: [0, 60],
  grace_period_days: [0, 60],
  next_member_number: [1, Number.MAX_SAFE_INTEGER],
  next_receipt_number: [1, Number.MAX_SAFE_INTEGER],
  auto_checkout_hours: [0, 24],
  lock_after_minutes: [0, 60],
  backup_reminder_days: [1, 90],
};

export function isSettingKey(key: string): key is SettingKey {
  return key in SETTINGS_DEFAULTS;
}

/** True if `value` is acceptable for `key` (same type as the default, enum/range respected). */
export function isValidSettingValue<K extends SettingKey>(key: K, value: unknown): value is AppSettings[K] {
  if (value === null) return NULLABLE.has(key);
  const fallback = SETTINGS_DEFAULTS[key];
  const expected = fallback === null ? 'string' : typeof fallback;
  if (typeof value !== expected) return false;
  const allowed = ENUMS[key];
  if (allowed && !allowed.includes(value as string)) return false;
  const range = RANGES[key];
  if (range && (!Number.isInteger(value) || (value as number) < range[0] || (value as number) > range[1])) return false;
  if (key === 'tax_percent' && !((value as number) >= 0 && (value as number) <= 100)) return false;
  if (key === 'daily_summary_time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value as string)) return false;
  return true;
}

/** Raw key/value rows → complete typed settings. Unknown keys are ignored. */
export function resolveSettings(raw: Record<string, unknown>): AppSettings {
  const out: AppSettings = { ...SETTINGS_DEFAULTS };
  for (const key of SETTING_KEYS) {
    const value = raw[key];
    if (value !== undefined && isValidSettingValue(key, value)) (out as Record<SettingKey, unknown>)[key] = value;
  }
  return out;
}
