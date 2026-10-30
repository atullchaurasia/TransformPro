import { getDb, writeTransaction } from '@/db/client';
import {
  attendanceRepo,
  branchesRepo,
  enquiriesRepo,
  enquiryFollowupsRepo,
  expenseCategoriesRepo,
  expensesRepo,
  freezesRepo,
  measurementsRepo,
  membersRepo,
  messageLogRepo,
  messageTemplatesRepo,
  paymentsRepo,
  plansRepo,
  setSetting,
  staffAttendanceRepo,
  staffRepo,
  subscriptionsRepo,
  writeAudit,
} from '@/db/repositories';
import { newId, nowIso } from '@/utils/id';

export const ALL_TABLES = [
  'settings',
  'branches',
  'staff',
  'members',
  'plans',
  'subscriptions',
  'freezes',
  'payments',
  'attendance',
  'staff_attendance',
  'measurements',
  'enquiries',
  'enquiry_followups',
  'expense_categories',
  'expenses',
  'message_templates',
  'message_log',
  'audit_log',
] as const;

export async function tableCounts(): Promise<Record<string, number>> {
  const db = getDb();
  const out: Record<string, number> = {};
  for (const table of ALL_TABLES) {
    const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`, []);
    out[table] = row?.n ?? 0;
  }
  return out;
}

/** DEV ONLY (M02 "done when"): one row in every table, all in one transaction. */
export async function insertDevSample(): Promise<void> {
  const tag = newId().slice(0, 4).toUpperCase();
  const today = nowIso().slice(0, 10);
  await writeTransaction(async (tx) => {
    await setSetting(tx, 'dev_last_sample', tag);
    const branch = await branchesRepo.create(tx, { name: `[DEV] Branch ${tag}`, address: null, phone: null, isActive: true });
    // A manager, not an owner: onboarding (M04) creates the one and only owner.
    const staff = await staffRepo.create(tx, {
      name: `[DEV] Staff ${tag}`, phone: null, role: 'manager', pinHash: null, pinSalt: null, permissions: '[]',
      branchId: branch.id, isActive: true, salaryPaise: 1500000, joinedOn: today, photoUri: null,
    });
    const plan = await plansRepo.create(tx, {
      name: `[DEV] Monthly ${tag}`, category: 'membership', durationValue: 1, durationUnit: 'months', sessionCount: null,
      pricePaise: 150000, admissionFeePaise: 50000, maxFreezeDays: 15, maxFreezeTimes: 1, color: '#FF6B2C',
      description: null, isActive: true, sortOrder: 99,
    });
    const member = await membersRepo.create(tx, {
      memberCode: `DEV${tag}`, branchId: branch.id, fullName: `[DEV] Member ${tag}`, phone: '919800000000', altPhone: null,
      email: null, gender: 'female', dateOfBirth: '1998-02-14', anniversaryDate: null, address: null, area: null, city: 'Pune',
      pincode: null, occupation: null, photoUri: null, emergencyContactName: null, emergencyContactPhone: null,
      emergencyContactRelation: null, bloodGroup: 'B+', medicalConditions: null, fitnessGoal: 'weight_loss', idProofType: null,
      idProofNumber: null, heightCm: 162, joiningDate: today, referredByMemberId: null, source: 'instagram',
      assignedTrainerId: staff.id, notes: null, biometricId: null, createdBy: staff.id,
    });
    const sub = await subscriptionsRepo.create(tx, {
      memberId: member.id, planId: plan.id, branchId: branch.id, planNameSnapshot: plan.name, categorySnapshot: 'membership',
      startDate: today, endDate: today, sessionsTotal: null, sessionsUsed: 0, basePricePaise: 150000, admissionFeePaise: 50000,
      discountPaise: 0, discountReason: null, taxPaise: 0, totalPaise: 200000, trainerId: null, status: 'active',
      frozenDaysTotal: 0, renewedFromSubscriptionId: null, cancelledReason: null, cancelledAt: null, refundPaise: null, createdBy: staff.id,
    });
    await freezesRepo.create(tx, { subscriptionId: sub.id, memberId: member.id, fromDate: today, toDate: null, days: null, reason: 'dev', createdBy: staff.id, endedAt: null });
    await paymentsRepo.create(tx, {
      receiptNumber: `DEV-${tag}`, memberId: member.id, subscriptionId: sub.id, branchId: branch.id, amountPaise: 100000, mode: 'upi',
      reference: null, paidOn: today, note: null, receivedBy: staff.id, isRefund: false,
    });
    await attendanceRepo.create(tx, { memberId: member.id, branchId: branch.id, date: today, checkInAt: nowIso(), checkOutAt: null, method: 'manual', subscriptionId: sub.id, markedBy: staff.id });
    await staffAttendanceRepo.create(tx, { staffId: staff.id, date: today, checkInAt: nowIso(), checkOutAt: null, note: null });
    await measurementsRepo.create(tx, {
      memberId: member.id, measuredOn: today, weightKg: 62.5, heightCm: 162, bmi: 23.8, bodyFatPct: 28, muscleMassKg: null,
      chestCm: null, waistCm: 74, hipsCm: null, neckCm: null, shouldersCm: null, bicepsLeftCm: null, bicepsRightCm: null,
      forearmCm: null, thighLeftCm: null, thighRightCm: null, calfCm: null, restingHr: 72, notes: null, photoUri: null, recordedBy: staff.id,
    });
    const enquiry = await enquiriesRepo.create(tx, {
      name: `[DEV] Lead ${tag}`, phone: '919811111111', email: null, gender: null, age: 28, source: 'google', interestedPlanId: plan.id,
      fitnessGoal: null, status: 'hot', nextFollowUpOn: today, nextFollowUpTime: '18:30', trialDate: null, notes: null,
      assignedTo: staff.id, convertedMemberId: null, lostReason: null,
    });
    await enquiryFollowupsRepo.create(tx, { enquiryId: enquiry.id, followedUpOn: nowIso(), channel: 'call', outcome: 'Interested', nextFollowUpOn: null, statusAfter: 'hot', staffId: staff.id });
    const category = await expenseCategoriesRepo.create(tx, { name: `[DEV] Category ${tag}`, icon: 'flash', isActive: true });
    await expensesRepo.create(tx, {
      branchId: branch.id, categoryId: category.id, amountPaise: 250000, spentOn: today, mode: 'cash', paidTo: 'Electricity board',
      note: null, receiptPhotoUri: null, isRecurring: true, recurEvery: 'monthly', createdBy: staff.id,
    });
    const template = await messageTemplatesRepo.create(tx, { key: null, language: 'en', title: `[DEV] ${tag}`, body: 'Hi {first_name}', category: 'custom', isSystem: false });
    await messageLogRepo.create(tx, { memberId: member.id, enquiryId: null, templateId: template.id, channel: 'whatsapp', bodySent: 'Hi', sentAt: nowIso(), sentBy: staff.id });
    await writeAudit(tx, { action: 'dev.sample', entity: 'dev', entityId: null, summary: `Inserted dev sample ${tag}`, staffId: staff.id });
  });
}

/** Proves foreign keys are enforced on the real device connection. Returns true if blocked. */
export async function foreignKeysEnforced(): Promise<boolean> {
  try {
    await writeTransaction((tx) =>
      tx.runAsync('INSERT INTO freezes (id, subscription_id, member_id, from_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
        newId(), 'missing', 'missing', '2026-01-01', nowIso(), nowIso(),
      ]),
    );
    return false;
  } catch (e) {
    return /FOREIGN KEY/i.test(String(e));
  }
}

export async function schemaVersion(): Promise<number> {
  const row = await getDb().getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  return row?.user_version ?? 0;
}
