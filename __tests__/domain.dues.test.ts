import {
  advancesToApply,
  allocatePayment,
  maxRefundable,
  memberDues,
  oldestDueSince,
  subscriptionDue,
  validateManualAllocation,
  type DuesPayment,
  type DuesSubscription,
} from '@/domain/dues';

const subA: DuesSubscription = { id: 'A', startDate: '2026-08-01', totalPaise: 200000, status: 'completed', createdAt: '2026-08-01T00:00:00Z' };
const subB: DuesSubscription = { id: 'B', startDate: '2026-09-01', totalPaise: 300000, status: 'active', createdAt: '2026-09-01T00:00:00Z' };

let n = 0;
function pay(subscriptionId: string | null, amountPaise: number, extra: Partial<DuesPayment> = {}): DuesPayment {
  n += 1;
  return {
    id: `p${n}`,
    subscriptionId,
    amountPaise,
    isRefund: false,
    deletedAt: null,
    paidOn: `2026-09-${String(n).padStart(2, '0')}`,
    createdAt: `2026-09-01T00:00:${String(n).padStart(2, '0')}Z`,
    ...extra,
  };
}

describe('subscription and member dues (§6.5)', () => {
  it('partial payments, refunds and deleted payments', () => {
    const payments = [pay('B', 100000), pay('B', 50000), pay('B', 20000, { isRefund: true }), pay('B', 99999, { deletedAt: '2026-09-10T00:00:00Z' })];
    expect(subscriptionDue(subB, payments)).toBe(170000);
    expect(maxRefundable('B', payments)).toBe(130000);
  });

  it('fully paid and cancelled subscriptions owe nothing', () => {
    expect(subscriptionDue(subA, [pay('A', 200000)])).toBe(0);
    expect(subscriptionDue({ ...subB, status: 'cancelled' }, [])).toBe(0);
  });

  it('member due = Σ subscription dues + unlinked charges − advance, oldest first', () => {
    const payments = [pay('A', 150000), pay(null, 30000)];
    const result = memberDues([subB, subA], payments, 5000);
    expect(result.subscriptions).toEqual([
      { subscriptionId: 'A', duePaise: 50000 },
      { subscriptionId: 'B', duePaise: 300000 },
    ]);
    expect(result.advancePaise).toBe(30000);
    expect(result.totalDuePaise).toBe(325000);
    expect(oldestDueSince([subB, subA], payments)).toBe('2026-08-01');
  });
});

describe('allocatePayment', () => {
  const dues = [
    { subscriptionId: 'A', duePaise: 50000 },
    { subscriptionId: 'B', duePaise: 300000 },
  ];

  it('applies to the oldest unpaid first and splits across subscriptions', () => {
    expect(allocatePayment(30000, dues)).toEqual({ ok: true, allocations: [{ subscriptionId: 'A', amountPaise: 30000 }] });
    expect(allocatePayment(100000, dues)).toEqual({
      ok: true,
      allocations: [
        { subscriptionId: 'A', amountPaise: 50000 },
        { subscriptionId: 'B', amountPaise: 50000 },
      ],
    });
  });

  it('overpayment is an error unless recorded as an advance', () => {
    expect(allocatePayment(400000, dues)).toEqual({ ok: false, error: 'overpayment', maxPaise: 350000 });
    const asAdvance = allocatePayment(400000, dues, true);
    expect(asAdvance.ok && asAdvance.allocations.at(-1)).toEqual({ subscriptionId: null, amountPaise: 50000 });
    expect(allocatePayment(10000, [], true)).toEqual({ ok: true, allocations: [{ subscriptionId: null, amountPaise: 10000 }] });
  });

  it('rejects zero, negative and fractional paise', () => {
    expect(allocatePayment(0, dues).ok).toBe(false);
    expect(allocatePayment(-5, dues).ok).toBe(false);
    expect(allocatePayment(10.5, dues).ok).toBe(false);
  });

  it('validates a manual split', () => {
    expect(validateManualAllocation([{ subscriptionId: 'A', amountPaise: 50000 }], dues).ok).toBe(true);
    expect(validateManualAllocation([{ subscriptionId: 'A', amountPaise: 50001 }], dues)).toEqual({ ok: false, error: 'over_due', maxPaise: 50000 });
  });
});

describe('advancesToApply', () => {
  it('links whole advance payments that fit, oldest first', () => {
    const a1 = pay(null, 100000);
    const a2 = pay(null, 250000);
    const a3 = pay(null, 50000);
    expect(advancesToApply([a1, a2, a3, pay('B', 1000)], 200000)).toEqual([a1.id, a3.id]);
  });

  it('a refunded advance is not applied twice', () => {
    const a1 = pay(null, 100000);
    const refund = pay(null, 100000, { isRefund: true });
    expect(advancesToApply([a1, refund], 200000)).toEqual([]);
  });
});
