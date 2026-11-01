import {
  activeFilterCount,
  ageOn,
  buildMemberSummaries,
  filterMembers,
  isBirthdayInMonth,
  maskIdNumber,
  NO_FILTERS,
  sortMembers,
  type ListSubscription,
  type MemberListRow,
  type MemberSummary,
} from '@/domain/memberList';
import { draftSubscription, newLine, planNewMemberPayment, LineError } from '@/domain/newMember';
import { formToMember, localPhone, memberFormSchema, emptyMemberForm } from '@/features/members/memberSchema';

const settings = { expiringSoonDays: 7, gracePeriodDays: 3 };
const today = '2026-10-15';

function row(id: string, extra: Partial<MemberListRow> = {}): MemberListRow {
  return {
    id,
    memberCode: id.toUpperCase(),
    fullName: id,
    phone: '919800000000',
    photoUri: null,
    gender: 'male',
    dateOfBirth: null,
    anniversaryDate: null,
    joiningDate: '2026-01-01',
    createdAt: '2026-01-01T00:00:00Z',
    branchId: null,
    assignedTrainerId: null,
    ...extra,
  };
}

function sub(id: string, memberId: string, extra: Partial<ListSubscription> = {}): ListSubscription {
  return {
    id,
    memberId,
    planId: 'monthly',
    planNameSnapshot: 'Monthly',
    categorySnapshot: 'membership',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: 'active',
    trainerId: null,
    sessionsTotal: null,
    sessionsUsed: 0,
    totalPaise: 150000,
    ...extra,
  };
}

describe('buildMemberSummaries', () => {
  it('computes status, dues (net of refunds and advances), plan, trainer and last visit', () => {
    const list = buildMemberSummaries({
      members: [row('a'), row('b'), row('c', { assignedTrainerId: 't9' })],
      subscriptions: [
        sub('s1', 'a'),
        sub('s2', 'b', { endDate: '2026-10-20' }),
        sub('s3', 'c', { categorySnapshot: 'personal_training', planNameSnapshot: 'PT', trainerId: 't1', totalPaise: 500000 }),
      ],
      openFreezes: [],
      netPaidBySubscription: new Map([
        ['s1', 150000],
        ['s2', 50000],
        ['s3', 0],
      ]),
      advanceByMember: new Map([['c', 100000]]),
      lastVisitByMember: new Map([['a', '2026-10-14']]),
      today,
      settings,
    });
    const [a, b, c] = list;
    expect(a).toMatchObject({ status: 'active', daysLeft: 16, duePaise: 0, planName: 'Monthly', planId: 'monthly', lastVisit: '2026-10-14', expiryDate: '2026-10-31' });
    expect(b).toMatchObject({ status: 'expiring', daysLeft: 5, duePaise: 100000 });
    expect(c).toMatchObject({ status: 'noPlan', duePaise: 400000, hasActivePT: true, trainerId: 't1' });
  });
});

describe('filters and sort (§10.2)', () => {
  const base = (id: string, extra: Partial<MemberSummary>): MemberSummary => ({
    ...row(id),
    status: 'active',
    daysLeft: 10,
    daysSinceExpiry: null,
    planName: 'Monthly',
    planId: 'p1',
    expiryDate: '2026-10-25',
    duePaise: 0,
    hasActivePT: false,
    trainerId: null,
    lastVisit: null,
    ...extra,
  });
  const list = [
    base('Zara', { status: 'expiring', duePaise: 500, expiryDate: '2026-10-18', dateOfBirth: '1990-10-03', gender: 'female', lastVisit: '2026-10-10' }),
    base('Amit', { status: 'grace', planId: 'p2', expiryDate: '2026-10-13', createdAt: '2026-05-01T00:00:00Z', lastVisit: '2026-10-14' }),
    base('Mona', { status: 'noPlan', planId: null, expiryDate: null, hasActivePT: true, trainerId: 't1', joiningDate: '2026-09-01' }),
  ];

  it('status chips group sensibly', () => {
    const names = (f: Partial<typeof NO_FILTERS>) => filterMembers(list, { ...NO_FILTERS, ...f }, today).map((m) => m.fullName);
    expect(names({ status: 'active' })).toEqual(['Zara']); // includes expiring
    expect(names({ status: 'expired' })).toEqual(['Amit']); // includes grace
    expect(names({ status: 'noPlan' })).toEqual(['Mona']);
    expect(names({ hasDues: true })).toEqual(['Zara']);
    expect(names({ birthdayThisMonth: true })).toEqual(['Zara']);
    expect(names({ ptMembers: true, trainerId: 't1' })).toEqual(['Mona']);
    expect(names({ gender: 'female' })).toEqual(['Zara']);
    expect(names({ planIds: ['p2'] })).toEqual(['Amit']);
    expect(names({ joinedFrom: '2026-08-01' })).toEqual(['Mona']);
    expect(activeFilterCount({ ...NO_FILTERS, hasDues: true, planIds: ['x'], joinedTo: '2026-01-01' })).toBe(3);
  });

  it('sorts', () => {
    const ids = (s: Parameters<typeof sortMembers>[1]) => sortMembers(list, s).map((m) => m.fullName);
    expect(ids('name')).toEqual(['Amit', 'Mona', 'Zara']);
    expect(ids('expiry')).toEqual(['Amit', 'Zara', 'Mona']); // no expiry last
    expect(ids('due')[0]).toBe('Zara');
    expect(ids('lastVisit')).toEqual(['Amit', 'Zara', 'Mona']);
    expect(ids('newest')[0]).toBe('Amit');
  });

  it('helpers', () => {
    expect(isBirthdayInMonth('1990-10-31', today)).toBe(true);
    expect(isBirthdayInMonth(null, today)).toBe(false);
    expect(ageOn('2000-10-16', today)).toBe(25);
    expect(ageOn('2000-10-15', today)).toBe(26);
    expect(maskIdNumber('aadhaar', '1234 5678 9012')).toBe('XXXX XXXX 9012');
    expect(maskIdNumber('pan', 'ABCDE1234F')).toBe('ABCDE1234F');
  });
});

describe('new member: plan lines and payment (§10.2)', () => {
  const monthly = { id: 'm', name: 'Monthly', category: 'membership' as const, durationValue: 1, durationUnit: 'months' as const, sessionCount: null, pricePaise: 200000, admissionFeePaise: 50000 };
  const pt = { ...monthly, id: 'pt', name: 'PT 12', category: 'personal_training' as const, durationUnit: 'sessions' as const, durationValue: 60, sessionCount: 12, pricePaise: 600000, admissionFeePaise: 0 };
  const noTax = { enabled: false, percent: 18, inclusive: true };

  it('drafts a subscription with snapshots, admission and discount', () => {
    const line = { ...newLine(monthly, '2026-01-31'), discount: { type: 'percent' as const, percent: 10 }, discountReason: ' Diwali ' };
    expect(line.endDate).toBe('2026-02-28');
    const d = draftSubscription(line, noTax);
    expect(d).toMatchObject({ planNameSnapshot: 'Monthly', basePricePaise: 200000, admissionFeePaise: 50000, discountPaise: 25000, totalPaise: 225000, discountReason: 'Diwali', sessionsTotal: null });
    const p = draftSubscription({ ...newLine(pt, '2026-01-01'), trainerId: 't1' }, noTax);
    expect(p).toMatchObject({ sessionsTotal: 12, endDate: '2026-03-01', trainerId: 't1', categorySnapshot: 'personal_training' });
    expect(() => draftSubscription({ ...line, endDate: '2026-01-01' }, noTax)).toThrow(LineError);
  });

  it('splits paid-now across lines; overpayment only as advance', () => {
    const drafts = [{ totalPaise: 225000 }, { totalPaise: 600000 }];
    const partial = planNewMemberPayment(drafts, 300000, false);
    expect(partial.ok && partial.plan).toEqual({ totalPaise: 825000, paidPaise: 300000, balancePaise: 525000, allocations: [{ index: 0, amountPaise: 225000 }, { index: 1, amountPaise: 75000 }] });
    expect(planNewMemberPayment(drafts, 900000, false)).toMatchObject({ ok: false, error: 'overpayment' });
    const adv = planNewMemberPayment(drafts, 900000, true);
    expect(adv.ok && adv.plan.allocations.at(-1)).toEqual({ index: null, amountPaise: 75000 });
    expect(planNewMemberPayment(drafts, 0, false)).toMatchObject({ ok: true, plan: { allocations: [], balancePaise: 825000 } });
  });
});

describe('member form schema', () => {
  const m = { required: 'req', phone: 'ph', email: 'em', pincode: 'pin', height: 'h', futureDate: 'fut', code: 'code', aadhaar: 'aad', pan: 'pan' };
  const schema = memberFormSchema(m, '+91', today);
  const ok = { ...emptyMemberForm(today, null), fullName: 'Rahul', phone: '98765 43210' };

  it('requires only name, phone and joining date', () => {
    expect(schema.safeParse(ok).success).toBe(true);
    expect(schema.safeParse({ ...ok, fullName: '' }).success).toBe(false);
    expect(schema.safeParse({ ...ok, phone: '12345' }).success).toBe(false);
  });

  it('validates optional fields only when filled', () => {
    expect(schema.safeParse({ ...ok, pincode: '1234' }).success).toBe(false);
    expect(schema.safeParse({ ...ok, heightCm: '300' }).success).toBe(false);
    expect(schema.safeParse({ ...ok, dateOfBirth: '2027-01-01' }).success).toBe(false);
    expect(schema.safeParse({ ...ok, idProofType: 'aadhaar', idProofNumber: '1234' }).success).toBe(false);
    expect(schema.safeParse({ ...ok, idProofType: 'aadhaar', idProofNumber: '1234 5678 9012' }).success).toBe(true);
    expect(schema.safeParse({ ...ok, memberCode: 'GYM 1' }).success).toBe(false);
  });

  it('normalises on save and round-trips phones', () => {
    const out = formToMember({ ...ok, fullName: '  Rahul   Sharma ', altPhone: '09812345678', memberCode: 'gym0009', idProofNumber: 'abcde1234f', idProofType: 'pan' }, '+91');
    expect(out).toMatchObject({ fullName: 'Rahul Sharma', phone: '919876543210', altPhone: '919812345678', memberCode: 'GYM0009', idProofNumber: 'ABCDE1234F', email: null });
    expect(localPhone('919876543210', '+91')).toBe('9876543210');
    expect(localPhone('447911123456', '+91')).toBe('447911123456');
  });
});
