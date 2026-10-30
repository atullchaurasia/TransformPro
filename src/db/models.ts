// App-side models: camelCase mirrors of the §5.2 tables (repositories convert to/from
// snake_case). Dates are 'YYYY-MM-DD' strings, timestamps ISO strings, money integer paise.

export type ISODate = string;
export type ISOTimestamp = string;
export type Paise = number;

type Base = { id: string; createdAt: ISOTimestamp; updatedAt: ISOTimestamp };
type SoftDeletable = { deletedAt: ISOTimestamp | null };

export type StaffRole = 'owner' | 'manager' | 'receptionist' | 'trainer';
export type Gender = 'male' | 'female' | 'other';
export type FitnessGoal = 'weight_loss' | 'muscle_gain' | 'general_fitness' | 'strength' | 'endurance' | 'other';
export type LeadSource = 'walk_in' | 'referral' | 'instagram' | 'facebook' | 'google' | 'flyer' | 'other';
export type PlanCategory = 'membership' | 'personal_training' | 'service';
export type DurationUnit = 'days' | 'months' | 'years' | 'sessions';
export type SubscriptionStatus = 'active' | 'frozen' | 'cancelled' | 'completed';
export type PaymentMode = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other';
export type CheckinMethod = 'manual' | 'qr' | 'search';
export type EnquiryStatus = 'hot' | 'warm' | 'cold' | 'converted' | 'lost';
export type FollowUpChannel = 'call' | 'whatsapp' | 'sms' | 'visit';
export type MessageChannel = 'whatsapp' | 'sms' | 'call' | 'email';
export type TemplateCategory =
  | 'expiry_reminder'
  | 'expired'
  | 'dues'
  | 'birthday'
  | 'anniversary'
  | 'welcome'
  | 'renewal_thanks'
  | 'payment_receipt'
  | 'absent'
  | 'enquiry_followup'
  | 'festival'
  | 'custom';

export type Branch = Base & { name: string; address: string | null; phone: string | null; isActive: boolean };

export type Staff = Base &
  SoftDeletable & {
    name: string;
    phone: string | null;
    role: StaffRole;
    pinHash: string | null;
    pinSalt: string | null;
    /** JSON array of permission keys (§15). */
    permissions: string;
    branchId: string | null;
    isActive: boolean;
    salaryPaise: Paise | null;
    joinedOn: ISODate | null;
    photoUri: string | null;
  };

export type Member = Base &
  SoftDeletable & {
    memberCode: string;
    branchId: string | null;
    fullName: string;
    /** Digits incl. country code, e.g. 919876543210 (§6.9). */
    phone: string;
    altPhone: string | null;
    email: string | null;
    gender: Gender | null;
    dateOfBirth: ISODate | null;
    anniversaryDate: ISODate | null;
    address: string | null;
    area: string | null;
    city: string | null;
    pincode: string | null;
    occupation: string | null;
    photoUri: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelation: string | null;
    bloodGroup: string | null;
    medicalConditions: string | null;
    fitnessGoal: FitnessGoal | null;
    idProofType: string | null;
    idProofNumber: string | null;
    heightCm: number | null;
    joiningDate: ISODate;
    referredByMemberId: string | null;
    source: LeadSource | null;
    assignedTrainerId: string | null;
    notes: string | null;
    biometricId: string | null;
    createdBy: string | null;
  };

export type Plan = Base &
  SoftDeletable & {
    name: string;
    category: PlanCategory;
    durationValue: number;
    durationUnit: DurationUnit;
    sessionCount: number | null;
    pricePaise: Paise;
    admissionFeePaise: Paise;
    maxFreezeDays: number;
    maxFreezeTimes: number;
    color: string | null;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
  };

export type Subscription = Base & {
  memberId: string;
  planId: string;
  branchId: string | null;
  planNameSnapshot: string;
  categorySnapshot: PlanCategory;
  startDate: ISODate;
  /** Inclusive last valid day. */
  endDate: ISODate;
  sessionsTotal: number | null;
  sessionsUsed: number;
  basePricePaise: Paise;
  admissionFeePaise: Paise;
  discountPaise: Paise;
  discountReason: string | null;
  taxPaise: Paise;
  totalPaise: Paise;
  trainerId: string | null;
  status: SubscriptionStatus;
  frozenDaysTotal: number;
  renewedFromSubscriptionId: string | null;
  cancelledReason: string | null;
  cancelledAt: ISOTimestamp | null;
  refundPaise: Paise | null;
  createdBy: string | null;
};

export type Freeze = Base & {
  subscriptionId: string;
  memberId: string;
  fromDate: ISODate;
  toDate: ISODate | null;
  days: number | null;
  reason: string | null;
  createdBy: string | null;
  endedAt: ISOTimestamp | null;
};

export type Payment = Base &
  SoftDeletable & {
    receiptNumber: string;
    memberId: string;
    subscriptionId: string | null;
    branchId: string | null;
    amountPaise: Paise;
    mode: PaymentMode;
    reference: string | null;
    paidOn: ISODate;
    note: string | null;
    receivedBy: string | null;
    isRefund: boolean;
  };

export type Attendance = Base & {
  memberId: string;
  branchId: string | null;
  date: ISODate;
  checkInAt: ISOTimestamp;
  checkOutAt: ISOTimestamp | null;
  method: CheckinMethod;
  subscriptionId: string | null;
  markedBy: string | null;
};

export type StaffAttendance = Base & {
  staffId: string;
  date: ISODate;
  checkInAt: ISOTimestamp;
  checkOutAt: ISOTimestamp | null;
  note: string | null;
};

export type Measurement = Base & {
  memberId: string;
  measuredOn: ISODate;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  neckCm: number | null;
  shouldersCm: number | null;
  bicepsLeftCm: number | null;
  bicepsRightCm: number | null;
  forearmCm: number | null;
  thighLeftCm: number | null;
  thighRightCm: number | null;
  calfCm: number | null;
  restingHr: number | null;
  notes: string | null;
  photoUri: string | null;
  recordedBy: string | null;
};

export type Enquiry = Base &
  SoftDeletable & {
    name: string;
    phone: string;
    email: string | null;
    gender: Gender | null;
    age: number | null;
    source: LeadSource | null;
    interestedPlanId: string | null;
    fitnessGoal: FitnessGoal | null;
    status: EnquiryStatus;
    nextFollowUpOn: ISODate | null;
    /** 'HH:mm' local time. */
    nextFollowUpTime: string | null;
    trialDate: ISODate | null;
    notes: string | null;
    assignedTo: string | null;
    convertedMemberId: string | null;
    lostReason: string | null;
  };

export type EnquiryFollowup = Base & {
  enquiryId: string;
  followedUpOn: ISOTimestamp;
  channel: FollowUpChannel;
  outcome: string | null;
  nextFollowUpOn: ISODate | null;
  statusAfter: EnquiryStatus | null;
  staffId: string | null;
};

export type ExpenseCategory = Base & { name: string; icon: string | null; isActive: boolean };

export type Expense = Base &
  SoftDeletable & {
    branchId: string | null;
    categoryId: string;
    amountPaise: Paise;
    spentOn: ISODate;
    mode: PaymentMode;
    paidTo: string | null;
    note: string | null;
    receiptPhotoUri: string | null;
    isRecurring: boolean;
    recurEvery: 'monthly' | null;
    createdBy: string | null;
  };

export type MessageTemplate = Base & {
  key: string | null;
  language: string;
  title: string;
  body: string;
  category: TemplateCategory;
  isSystem: boolean;
};

export type MessageLog = Base & {
  memberId: string | null;
  enquiryId: string | null;
  templateId: string | null;
  channel: MessageChannel;
  bodySent: string | null;
  sentAt: ISOTimestamp;
  sentBy: string | null;
};

export type AuditLog = Base & {
  staffId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
};

/** Fields the caller provides on insert (id/timestamps are generated). */
export type NewRow<M> = Omit<M, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { id?: string };
export type RowPatch<M> = Partial<Omit<M, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;
