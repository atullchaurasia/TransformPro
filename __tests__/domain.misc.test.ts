import { bmiCategory, computeBmi } from '@/domain/bmi';
import { can, defaultPermissions, memberScope, parsePermissions, PERMISSION_KEYS, serializePermissions } from '@/domain/permissions';
import { buildTemplateValues, PLACEHOLDERS, placeholdersIn, renderTemplate } from '@/domain/templates';

describe('templates (§10.7)', () => {
  it('has all 15 placeholders', () => {
    expect(PLACEHOLDERS).toHaveLength(15);
  });

  it('renders every placeholder from raw data', () => {
    const values = buildTemplateValues({
      memberName: 'Rahul Kumar Sharma',
      memberCode: 'GYM0001',
      gymName: 'Iron Gym',
      gymPhone: '+91 98765 43210',
      planName: 'Monthly',
      startDate: '2026-10-01',
      expiryDate: '2026-10-31',
      daysLeft: 3,
      daysSinceExpiry: 0,
      duePaise: 150000,
      paidPaise: 50050,
      receiptNo: 'RCPT00012',
      trainerName: 'Vikram',
      today: '2026-10-28',
      dateFormat: 'DD/MM/YYYY',
      currency: 'INR',
    });
    const body = PLACEHOLDERS.map((p) => `{${p}}`).join('|');
    expect(renderTemplate(body, values)).toBe(
      'Rahul Kumar Sharma|Rahul|GYM0001|Iron Gym|+91 98765 43210|Monthly|01/10/2026|31/10/2026|3|0|₹1,500|₹500.50|RCPT00012|Vikram|28/10/2026',
    );
  });

  it('missing values become empty; unknown tokens are untouched', () => {
    expect(renderTemplate('Hi {first_name}, {foo} {due_amount}', { first_name: 'Asha' })).toBe('Hi Asha, {foo} ');
    expect(placeholdersIn('{first_name} {foo} {first_name}')).toEqual({ known: ['first_name'], unknown: ['foo'] });
  });
});

describe('permissions (§15, §10.13)', () => {
  const staff = (role: 'owner' | 'manager' | 'receptionist' | 'trainer', permissions: string | null = null, isActive = true) => ({ role, permissions, isActive });

  it('owner can do everything; inactive or missing staff nothing', () => {
    expect(PERMISSION_KEYS.every((k) => can(staff('owner', '[]'), k))).toBe(true);
    expect(can(staff('owner', null, false), 'members.view')).toBe(false);
    expect(can(null, 'members.view')).toBe(false);
  });

  it('manager defaults exclude staff, permanent delete, restore, security, payment delete, erase', () => {
    const m = defaultPermissions('manager');
    for (const k of ['staff.manage', 'members.delete_permanent', 'backup.restore', 'settings.security', 'payments.delete', 'data.erase'] as const) {
      expect(m).not.toContain(k);
    }
    expect(m).toContain('reports.financial');
    expect(m).toContain('attendance.override_block');
    expect(m).toContain('membership.freeze_override');
  });

  it('receptionist and trainer defaults', () => {
    const r = staff('receptionist');
    expect(can(r, 'payments.create')).toBe(true);
    expect(can(r, 'reports.financial')).toBe(false);
    expect(can(r, 'members.delete')).toBe(false);
    expect(can(r, 'expenses.view')).toBe(false);
    expect(can(r, 'settings.manage')).toBe(false);
    const t = staff('trainer');
    expect(memberScope(t)).toBe('assigned');
    expect(can(t, 'measurements.manage')).toBe(true);
    expect(can(t, 'payments.view')).toBe(false);
    expect(can(t, 'reports.view')).toBe(false);
  });

  it('custom permissions override role defaults; bad JSON falls back', () => {
    const custom = staff('trainer', serializePermissions(['members.view', 'members.view_all', 'bogus']));
    expect(memberScope(custom)).toBe('all');
    expect(parsePermissions('[\"members.view\",\"bogus\"]', 'trainer')).toEqual(['members.view']);
    expect(parsePermissions('not json', 'trainer')).toEqual(defaultPermissions('trainer'));
  });
});

describe('BMI', () => {
  it('computes kg/m² to 1 decimal', () => {
    expect(computeBmi(70, 175)).toBe(22.9);
    expect(computeBmi(null, 175)).toBeNull();
    expect(computeBmi(70, 0)).toBeNull();
  });

  it('WHO categories', () => {
    expect(bmiCategory(18.4)).toBe('underweight');
    expect(bmiCategory(18.5)).toBe('normal');
    expect(bmiCategory(25)).toBe('overweight');
    expect(bmiCategory(30)).toBe('obese');
  });
});
