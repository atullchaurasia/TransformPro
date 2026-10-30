// DEV ONLY: bulk demo members to check that 2,000+ rows scroll smoothly (M06 "done when").
// The owner-facing demo-data feature with realistic everything is M20.
import { addDays, format } from 'date-fns';

import { writeTransaction } from '@/db/client';
import { listActivePlans } from '@/db/repositories/plans';
import { allocateMemberCode, allocateReceiptNumber } from '@/db/repositories/codes';
import { membersRepo, paymentsRepo, subscriptionsRepo } from '@/db/repositories';
import { planDuration } from '@/domain/plans';
import { computeEndDate } from '@/domain/dates';

const FIRST = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rohit', 'Pooja', 'Arjun', 'Kavya', 'Suresh', 'Neha', 'Karan', 'Divya', 'Manish', 'Ritu'];
const LAST = ['Sharma', 'Verma', 'Patel', 'Singh', 'Gupta', 'Kumar', 'Reddy', 'Iyer', 'Nair', 'Joshi', 'Mehta', 'Chopra'];

export async function insertDemoMembers(count = 2000): Promise<number> {
  return writeTransaction(async (tx) => {
    const plan = (await listActivePlans(tx, 'membership'))[0];
    const today = new Date();
    for (let i = 0; i < count; i++) {
      const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
      const joined = format(addDays(today, -((i * 13) % 400)), 'yyyy-MM-dd');
      const member = await membersRepo.create(tx, {
        memberCode: await allocateMemberCode(tx),
        branchId: null,
        fullName: name,
        phone: `91${String(7000000000 + i * 7919).slice(0, 10)}`,
        altPhone: null,
        email: null,
        gender: i % 3 === 0 ? 'female' : 'male',
        dateOfBirth: format(addDays(today, -(9000 + ((i * 37) % 5000))), 'yyyy-MM-dd'),
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
        joiningDate: joined,
        referredByMemberId: null,
        source: 'walk_in',
        assignedTrainerId: null,
        notes: 'Demo member',
        biometricId: null,
        createdBy: null,
      });
      if (!plan || i % 10 === 9) continue; // every 10th has no plan
      const start = format(addDays(today, -((i * 11) % 60)), 'yyyy-MM-dd');
      const total = plan.pricePaise || 150000;
      const sub = await subscriptionsRepo.create(tx, {
        memberId: member.id,
        planId: plan.id,
        branchId: null,
        planNameSnapshot: plan.name,
        categorySnapshot: 'membership',
        startDate: start,
        endDate: computeEndDate(start, planDuration(plan)),
        sessionsTotal: null,
        sessionsUsed: 0,
        basePricePaise: total,
        admissionFeePaise: 0,
        discountPaise: 0,
        discountReason: null,
        taxPaise: 0,
        totalPaise: total,
        trainerId: null,
        status: 'active',
        frozenDaysTotal: 0,
        renewedFromSubscriptionId: null,
        cancelledReason: null,
        cancelledAt: null,
        refundPaise: null,
        createdBy: null,
      });
      await paymentsRepo.create(tx, {
        receiptNumber: await allocateReceiptNumber(tx),
        memberId: member.id,
        subscriptionId: sub.id,
        branchId: null,
        // A quarter of them still owe half.
        amountPaise: i % 4 === 0 ? Math.round(total / 2) : total,
        mode: 'cash',
        reference: null,
        paidOn: start,
        note: null,
        receivedBy: null,
        isRefund: false,
      });
    }
    return count;
  });
}
