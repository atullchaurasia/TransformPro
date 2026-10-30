import { runMigrations } from '@/db/migrate';
import { MIGRATIONS } from '@/db/migrations';
import { branchesRepo, membersRepo, plansRepo, staffRepo, subscriptionsRepo } from '@/db/repositories';
import type { Db } from '@/db/types';

import { createTestDb, type TestDb } from './nodeDb';

export async function migratedDb(): Promise<TestDb> {
  const db = createTestDb();
  await runMigrations(db, MIGRATIONS);
  return db;
}

export async function seedBasics(db: Db) {
  const branch = await branchesRepo.create(db, { name: 'Main', address: null, phone: null, isActive: true });
  const owner = await staffRepo.create(db, {
    name: 'Owner',
    phone: '919876543210',
    role: 'owner',
    pinHash: 'h',
    pinSalt: 's',
    permissions: '[]',
    branchId: null,
    isActive: true,
    salaryPaise: null,
    joinedOn: null,
    photoUri: null,
  });
  const plan = await plansRepo.create(db, {
    name: 'Monthly',
    category: 'membership',
    durationValue: 1,
    durationUnit: 'months',
    sessionCount: null,
    pricePaise: 150000,
    admissionFeePaise: 0,
    maxFreezeDays: 0,
    maxFreezeTimes: 0,
    color: '#FF6B2C',
    description: null,
    isActive: true,
    sortOrder: 0,
  });
  return { branch, owner, plan };
}

export async function addMember(db: Db, overrides: Partial<Parameters<typeof membersRepo.create>[1]> = {}) {
  return membersRepo.create(db, {
    memberCode: 'TP0001',
    branchId: null,
    fullName: 'Rahul Sharma',
    phone: '919812345678',
    altPhone: null,
    email: null,
    gender: 'male',
    dateOfBirth: '1995-04-12',
    anniversaryDate: null,
    address: null,
    area: null,
    city: null,
    pincode: null,
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
    joiningDate: '2026-10-01',
    referredByMemberId: null,
    source: 'walk_in',
    assignedTrainerId: null,
    notes: null,
    biometricId: null,
    createdBy: null,
    ...overrides,
  });
}

export async function addSubscription(db: Db, memberId: string, planId: string, overrides: Partial<Parameters<typeof subscriptionsRepo.create>[1]> = {}) {
  return subscriptionsRepo.create(db, {
    memberId,
    planId,
    branchId: null,
    planNameSnapshot: 'Monthly',
    categorySnapshot: 'membership',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    sessionsTotal: null,
    sessionsUsed: 0,
    basePricePaise: 150000,
    admissionFeePaise: 0,
    discountPaise: 0,
    discountReason: null,
    taxPaise: 0,
    totalPaise: 150000,
    trainerId: null,
    status: 'active',
    frozenDaysTotal: 0,
    renewedFromSubscriptionId: null,
    cancelledReason: null,
    cancelledAt: null,
    refundPaise: null,
    createdBy: null,
    ...overrides,
  });
}
