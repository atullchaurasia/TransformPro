// CSV import write (spec §10.2): every valid row through the same save as Add member, in the
// caller's ONE transaction.
import type { RowResult } from '@/domain/csvImport';
import { draftSubscription, newLine, planNewMemberPayment } from '@/domain/newMember';
import type { TaxSettings } from '@/domain/money';

import type { Db } from '../types';

import { writeAudit } from './audit';
import { createMemberWithPlans } from './memberCreate';

export type ImportOptions = { tax: TaxSettings; branchId: string | null; createdBy: string | null; currency: string };

export async function importMembers(tx: Db, rows: Extract<RowResult, { status: 'ok' }>[], o: ImportOptions): Promise<number> {
  for (const r of rows) {
    const m = r.member;
    const drafts = [];
    if (r.plan) {
      // Imported members already joined: no admission fee is charged again.
      const line = { ...newLine(r.plan.plan, r.plan.startDate), includeAdmission: false };
      if (r.plan.endDate) line.endDate = r.plan.endDate;
      const { price: _price, ...draft } = draftSubscription(line, o.tax);
      drafts.push(draft);
    }
    const pay = r.plan && r.plan.paidPaise > 0 ? planNewMemberPayment(drafts, r.plan.paidPaise, false) : null;
    await createMemberWithPlans(tx, {
      member: {
        ...m,
        branchId: o.branchId,
        anniversaryDate: null,
        area: null,
        occupation: null,
        photoUri: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        emergencyContactRelation: null,
        bloodGroup: null,
        medicalConditions: null,
        fitnessGoal: null,
        idProofType: null,
        idProofNumber: null,
        heightCm: null,
        referredByMemberId: null,
        source: null,
        assignedTrainerId: null,
        biometricId: null,
        createdBy: o.createdBy,
      },
      subscriptions: drafts,
      payment: pay?.ok ? { plan: pay.plan, mode: 'cash', reference: null, paidOn: r.plan?.startDate ?? m.joiningDate, note: 'CSV import' } : null,
      currency: o.currency,
    });
  }
  await writeAudit(tx, { action: 'member.import', entity: 'member', summary: `Imported ${rows.length} member(s) from CSV` });
  return rows.length;
}
