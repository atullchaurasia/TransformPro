import { exportRows } from '@/db/repositories/exportData';
import { importMembers } from '@/db/repositories/memberImport';
import { autoMap, parseImportDate, sampleCsv, validateImport, type ImportContext } from '@/domain/csvImport';
import { toSheet } from '@/domain/exportData';
import { csvText, parseCsv, readWorkbookBase64, workbookBase64 } from '@/services/sheets';

import { addMember, migratedDb, seedBasics } from './helpers/fixtures';

const fmt = { date: (d: string) => d.split('-').reverse().join('/'), dateTime: (d: string) => d, label: (g: string, v: string) => `${g}:${v}` };

describe('export (§10.16)', () => {
  it('builds sheets with readable cells and filters by range / members, skipping Trash', async () => {
    const db = await migratedDb();
    await seedBasics(db);
    const a = await addMember(db, { memberCode: 'A1', fullName: 'Asha', phone: '919800000001', joiningDate: '2026-10-01', gender: 'female' });
    await addMember(db, { memberCode: 'B1', fullName: 'Bala', phone: '919800000002', joiningDate: '2026-09-01' });
    await db.runAsync("INSERT INTO payments (id, receipt_number, member_id, amount_paise, mode, paid_on, is_refund, created_at, updated_at) VALUES ('p1', 'R1', ?, 150050, 'upi', '2026-10-02', 0, '', ''), ('p2', 'R2', ?, 5000, 'cash', '2026-10-03', 1, '', '')", [a.id, a.id]);

    const members = await exportRows(db, 'members', { from: '2026-10-01', to: '2026-10-31' });
    expect(members.map((m) => m.full_name)).toEqual(['Asha']);
    expect((await exportRows(db, 'members', null, [a.id])).length).toBe(1);

    const sheet = toSheet('payments', await exportRows(db, 'payments', null), fmt, (k) => k.toUpperCase());
    expect(sheet[0]?.slice(0, 7)).toEqual(['RECEIPT_NUMBER', 'PAID_ON', 'MEMBER_CODE', 'FULL_NAME', 'PLAN_NAME', 'KIND', 'AMOUNT']);
    expect(sheet[1]?.slice(0, 8)).toEqual(['R1', '02/10/2026', 'A1', 'Asha', null, 'kind:payment', 1500.5, 'mode:upi']);
    expect(sheet[2]?.[6]).toBe(-50);

    const memberSheet = toSheet('members', members, fmt, (k) => k);
    expect(memberSheet[1]?.[5]).toBe('gender:female');

    const wb = readWorkbookBase64(workbookBase64([{ name: 'Payments: Oct/2026', rows: sheet }, { name: 'Members', rows: memberSheet }]));
    expect(wb.names).toEqual(['Payments  Oct 2026', 'Members']);
    expect(wb.rows('Members')[1]?.[1]).toBe('Asha');
    expect(csvText({ name: 'x', rows: [['a', 'b,c'], [1, null]] })).toBe('﻿a,"b,c"\n1,');
  });
});

describe('CSV import (§10.2)', () => {
  const ctx = (extra: Partial<ImportContext> = {}): ImportContext => ({
    countryCode: '+91',
    today: '2026-10-15',
    dateFormat: 'DD/MM/YYYY',
    plans: [{ id: 'p', name: 'Monthly', category: 'membership', durationValue: 1, durationUnit: 'months', sessionCount: null, pricePaise: 150000, admissionFeePaise: 50000 }],
    existingPhones: new Set(['919811111111']),
    existingCodes: new Set(['GYM0001']),
    skipDuplicates: true,
    ...extra,
  });

  it('parses the sample, auto-maps headers and parses dates', () => {
    const [head, ...rows] = parseCsv(sampleCsv());
    expect(rows).toHaveLength(1);
    const map = autoMap(head ?? []);
    expect(map).toMatchObject({ fullName: 0, phone: 1, planName: 12, amountPaid: 15 });
    expect(autoMap(['Name', 'Mobile No.', 'DOB', 'Plan', 'Paid'])).toMatchObject({ fullName: 0, phone: 1, dateOfBirth: 2, planName: 3, amountPaid: 4 });
    expect(parseImportDate('2026-10-01', 'MM/DD/YYYY')).toBe('2026-10-01');
    expect(parseImportDate('1/10/2026', 'DD/MM/YYYY')).toBe('2026-10-01');
    expect(parseImportDate('10-01-2026', 'MM/DD/YYYY')).toBe('2026-10-01');
    expect(parseImportDate('31/31/2026', 'DD/MM/YYYY')).toBe('invalid');
    expect(parseImportDate('', 'DD/MM/YYYY')).toBeNull();
  });

  it('validates per row: errors, duplicates (also inside the file), plans and amounts', () => {
    const csv = [
      'name,phone,gender,joining_date,plan,start_date,paid,member_code',
      'Asha,98000 00001,F,01/10/2026,monthly,01/10/2026,"1,000",',
      ',12345,x,99/99/2026,,,,',
      'Repeat,9811111111,,,,,,',
      'Twice,9800000001,,,,,,',
      'Rich,9800000003,,,Monthly,,2000,gym0001',
      'Ghost,9800000004,,,Yoga,,,',
    ].join('\n');
    const [head, ...rows] = parseCsv(csv);
    const res = validateImport(rows, autoMap(head ?? []), ctx());
    expect(res[0]).toMatchObject({ row: 2, status: 'ok', member: { fullName: 'Asha', phone: '919800000001', gender: 'female', joiningDate: '2026-10-01' }, plan: { startDate: '2026-10-01', paidPaise: 100000 } });
    expect(res[1]).toMatchObject({ status: 'error' });
    expect(res[1]?.status === 'error' && res[1].errors.map((e) => e.error)).toEqual(['name_required', 'phone_invalid', 'gender_invalid', 'date_invalid']);
    expect(res[2]).toEqual({ row: 4, status: 'duplicate', phone: '919811111111' });
    expect(res[3]).toEqual({ row: 5, status: 'duplicate', phone: '919800000001' });
    expect(res[4]?.status === 'error' && res[4].errors.map((e) => e.error)).toEqual(['code_taken', 'amount_over_total']);
    expect(res[5]?.status === 'error' && res[5].errors.map((e) => e.error)).toEqual(['plan_unknown']);
    expect(validateImport(rows, autoMap(head ?? []), ctx({ skipDuplicates: false }))[2]?.status).toBe('ok');
  });

  it('imports valid rows with plan + payment (no admission fee) in one go', async () => {
    const db = await migratedDb();
    const { plan } = await seedBasics(db);
    const [head, ...rows] = parseCsv('full_name,phone,plan_name,start_date,amount_paid\nAsha,9800000001,Monthly,01/10/2026,500\nBala,9800000002,,,');
    const valid = validateImport(rows, autoMap(head ?? []), ctx({ plans: [{ ...plan, admissionFeePaise: 50000 }] })).filter((r) => r.status === 'ok');
    expect(await importMembers(db, valid, { tax: { enabled: false, percent: 18, inclusive: true }, branchId: null, createdBy: null, currency: 'INR' })).toBe(2);
    const subs = await db.getAllAsync<{ start_date: string; end_date: string; total_paise: number }>('SELECT start_date, end_date, total_paise FROM subscriptions', []);
    expect(subs).toEqual([{ start_date: '2026-10-01', end_date: '2026-10-31', total_paise: 150000 }]);
    const pays = await db.getAllAsync<{ amount_paise: number; note: string }>('SELECT amount_paise, note FROM payments', []);
    expect(pays).toEqual([{ amount_paise: 50000, note: 'CSV import' }]);
    const codes = await db.getAllAsync<{ member_code: string }>('SELECT member_code FROM members ORDER BY member_code', []);
    expect(codes.map((c) => c.member_code)).toEqual(['GYM0001', 'GYM0002']);
  });
});
