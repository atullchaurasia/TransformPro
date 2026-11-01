import { completeOnboarding, type OnboardingInput } from '@/db/repositories/onboarding';
import { getSetting, loadSettings, saveSettings, setSetting } from '@/db/repositories/settings';
import { getOwner, listLoginStaff } from '@/db/repositories/staff';
import { parsePermissions } from '@/domain/permissions';
import { SEED_EXPENSE_CATEGORIES, SEED_PLANS, SEED_TEMPLATES } from '@/domain/seedData';
import { isValidSettingValue, resolveSettings, SETTING_KEYS, SETTINGS_DEFAULTS } from '@/domain/settings';
import { gymSchema, ownerSchema, preferencesSchema } from '@/features/onboarding/schemas';

import { migratedDb } from './helpers/fixtures';

const SPEC_KEYS = [
  'gym_name', 'gym_logo_uri', 'gym_address', 'gym_phone', 'gym_email', 'gym_gstin', 'currency_code', 'currency_symbol',
  'country_code', 'date_format', 'language', 'expiring_soon_days', 'grace_period_days', 'member_code_prefix',
  'next_member_number', 'receipt_prefix', 'next_receipt_number', 'invoice_terms', 'tax_enabled', 'tax_percent',
  'tax_inclusive', 'default_branch_id', 'checkin_block_expired', 'checkin_block_dues', 'allow_multiple_checkins_per_day',
  'auto_checkout_hours', 'lock_enabled', 'lock_after_minutes', 'biometric_enabled', 'daily_summary_time',
  'backup_reminder_days', 'last_backup_at', 'theme', 'onboarding_complete', 'card_design', 'week_start',
  // Not in the §5.2 list but required elsewhere in the spec:
  'trash_auto_purge', // §10.2 "auto-purge … with setting to disable"
  'checkin_sound', // §10.4 "haptic feedback + optional sound"
];

describe('settings defaults (§5.2)', () => {
  it('has a typed default for every spec key', () => {
    expect([...SETTING_KEYS].sort()).toEqual([...SPEC_KEYS].sort());
    expect(SETTINGS_DEFAULTS).toMatchObject({
      currency_code: 'INR',
      currency_symbol: '₹',
      country_code: '+91',
      date_format: 'DD/MM/YYYY',
      expiring_soon_days: 7,
      grace_period_days: 0,
      member_code_prefix: 'GYM',
      receipt_prefix: 'RCPT',
      tax_percent: 18,
      tax_inclusive: true,
      checkin_block_expired: true,
      auto_checkout_hours: 3,
      lock_after_minutes: 1,
      daily_summary_time: '08:00',
      backup_reminder_days: 7,
      onboarding_complete: false,
    });
  });

  it('invalid or missing stored values fall back to defaults', () => {
    const s = resolveSettings({ gym_name: 'Iron', expiring_soon_days: 'seven', theme: 'purple', grace_period_days: 3, unknown: 1 });
    expect(s.gym_name).toBe('Iron');
    expect(s.expiring_soon_days).toBe(7);
    expect(s.theme).toBe('system');
    expect(s.grace_period_days).toBe(3);
    expect(isValidSettingValue('daily_summary_time', '25:00')).toBe(false);
    expect(isValidSettingValue('gym_logo_uri', null)).toBe(true);
    expect(isValidSettingValue('gym_name', null)).toBe(false);
  });

  it('round-trips through the settings table and rejects bad writes', async () => {
    const db = await migratedDb();
    await saveSettings(db, { gym_name: 'Iron Gym', tax_enabled: true, last_backup_at: null });
    const s = await loadSettings(db);
    expect(s.gym_name).toBe('Iron Gym');
    expect(s.tax_enabled).toBe(true);
    expect(s.receipt_prefix).toBe('RCPT');
    await expect(saveSettings(db, { expiring_soon_days: -1 })).rejects.toThrow();
    // A corrupt JSON value in the table doesn't break loading
    await db.runAsync("UPDATE settings SET value = '{bad' WHERE key = 'gym_name'", []);
    expect((await loadSettings(db)).gym_name).toBe('');
    await setSetting(db, 'theme', 'dark');
    expect(await getSetting(db, 'theme')).toBe('dark');
  });
});

describe('completeOnboarding (§7)', () => {
  const input: OnboardingInput = {
    gym: { name: 'Iron Gym', phone: '919876543210', address: 'MG Road', email: '', gstin: '', logoUri: null },
    owner: { name: 'Atul', phone: '919812345678', pinHash: 'hash', pinSalt: 'salt' },
    preferences: {
      currency_code: 'INR',
      currency_symbol: '₹',
      country_code: '+91',
      date_format: 'DD/MM/YYYY',
      expiring_soon_days: 5,
      grace_period_days: 2,
      language: 'hi',
      biometric_enabled: true,
    },
    plans: SEED_PLANS.map((p) => ({ ...p, pricePaise: 150000 })),
    today: '2026-10-30',
  };

  it('seeds everything in one go and marks onboarding complete', async () => {
    const db = await migratedDb();
    const owner = await completeOnboarding(db, input);

    expect(owner.role).toBe('owner');
    expect(parsePermissions(owner.permissions, 'owner').length).toBeGreaterThan(30);
    const count = async (table: string) => (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`, []))?.n;
    expect(await count('branches')).toBe(1);
    expect(await count('staff')).toBe(1);
    expect(await count('plans')).toBe(8);
    expect(await count('expense_categories')).toBe(12);
    expect(await count('message_templates')).toBe(26);
    expect(await count('audit_log')).toBe(1);

    const s = await loadSettings(db);
    expect(s).toMatchObject({ onboarding_complete: true, gym_name: 'Iron Gym', language: 'hi', expiring_soon_days: 5, lock_enabled: true, biometric_enabled: true });
    expect(s.default_branch_id).toBeTruthy();

    expect((await getOwner(db))?.id).toBe(owner.id);
    expect((await listLoginStaff(db)).map((x) => x.id)).toEqual([owner.id]);
  });

  it('cannot run twice (exactly one owner)', async () => {
    const db = await migratedDb();
    await completeOnboarding(db, input);
    await expect(completeOnboarding(db, input)).rejects.toThrow(/already/);
  });

  it('seed data matches the spec', () => {
    expect(SEED_PLANS.map((p) => p.name)).toEqual(['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Personal Training – Monthly', 'Locker', 'Diet Plan', 'Steam Bath']);
    expect(SEED_EXPENSE_CATEGORIES).toHaveLength(12);
    expect(SEED_TEMPLATES.en).toHaveLength(13);
    expect(SEED_TEMPLATES.hi.map((t) => t.key)).toEqual(SEED_TEMPLATES.en.map((t) => t.key));
  });
});

describe('onboarding form schemas', () => {
  const m = { required: 'req', email: 'email', gstin: 'gstin', phone: 'phone', number: 'num' };

  it('gym: only the name is required; GSTIN and email validated when given', () => {
    const s = gymSchema(m);
    expect(s.safeParse({ name: 'Iron', phone: '', address: '', email: '', gstin: '' }).success).toBe(true);
    expect(s.safeParse({ name: ' ', phone: '', address: '', email: '', gstin: '' }).success).toBe(false);
    expect(s.safeParse({ name: 'Iron', phone: '', address: '', email: 'x@', gstin: '' }).success).toBe(false);
    expect(s.parse({ name: 'Iron', phone: '', address: '', email: '', gstin: '27aapfu0939f1zv' }).gstin).toBe('27AAPFU0939F1ZV');
    expect(s.safeParse({ name: 'Iron', phone: '', address: '', email: '', gstin: '27AAPFU0939' }).success).toBe(false);
    expect(s.safeParse({ name: 'Iron', phone: '12345', address: '', email: '', gstin: '' }).success).toBe(false);
  });

  it('owner: name and a valid mobile', () => {
    const s = ownerSchema(m);
    expect(s.safeParse({ name: 'Atul', phone: '9876543210' }).success).toBe(true);
    expect(s.safeParse({ name: 'Atul', phone: '1234567890' }).success).toBe(false);
  });

  it('preferences: day counts 0–60', () => {
    const s = preferencesSchema(m);
    const ok = { currencyCode: 'INR', countryCode: '+91', dateFormat: 'DD/MM/YYYY', expiringSoonDays: '7', graceDays: '0' };
    expect(s.safeParse(ok).success).toBe(true);
    expect(s.safeParse({ ...ok, graceDays: '61' }).success).toBe(false);
    expect(s.safeParse({ ...ok, expiringSoonDays: 'x' }).success).toBe(false);
  });
});
