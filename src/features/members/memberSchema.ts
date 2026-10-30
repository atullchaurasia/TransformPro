// Add/Edit member form (spec §10.2). Only full name, phone and joining date are required.
import { z } from 'zod';

import type { FitnessGoal, Gender, LeadSource, Member, NewRow } from '@/db/models';
import { isValidCode } from '@/domain/codes';
import { normalizePhone, validatePhone } from '@/domain/phones';

export const GENDERS: Gender[] = ['male', 'female', 'other'];
export const FITNESS_GOALS: FitnessGoal[] = ['weight_loss', 'muscle_gain', 'general_fitness', 'strength', 'endurance', 'other'];
export const SOURCES: LeadSource[] = ['walk_in', 'referral', 'instagram', 'facebook', 'google', 'flyer', 'other'];
export const ID_PROOF_TYPES = ['aadhaar', 'pan', 'driving_licence', 'voter_id', 'passport', 'other'] as const;
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export type MemberFormMessages = {
  required: string;
  phone: string;
  email: string;
  pincode: string;
  height: string;
  futureDate: string;
  code: string;
  aadhaar: string;
  pan: string;
};

const opt = z.string().trim();
const optDate = z.string().nullable();

export function memberFormSchema(m: MemberFormMessages, countryCode: string, today: string) {
  const phoneOk = (v: string) => validatePhone(normalizePhone(v, countryCode), countryCode) === null;
  return z
    .object({
      photoUri: z.string().nullable(),
      fullName: z.string().trim().min(1, m.required).max(100),
      phone: z.string().trim().min(1, m.required).refine(phoneOk, m.phone),
      altPhone: opt.refine((v) => v === '' || phoneOk(v), m.phone),
      email: z.union([z.literal(''), z.email(m.email)]),
      gender: z.union([z.literal(''), z.enum(['male', 'female', 'other'])]),
      dateOfBirth: optDate.refine((v) => !v || v <= today, m.futureDate),
      anniversaryDate: optDate,
      address: opt.max(300),
      area: opt.max(80),
      city: opt.max(80),
      pincode: opt.refine((v) => v === '' || (countryCode === '+91' ? /^\d{6}$/.test(v) : /^[A-Za-z0-9 -]{3,10}$/.test(v)), m.pincode),
      occupation: opt.max(80),
      bloodGroup: opt,
      heightCm: opt.refine((v) => v === '' || (/^\d{2,3}(\.\d)?$/.test(v) && Number(v) >= 50 && Number(v) <= 250), m.height),
      medicalConditions: opt.max(500),
      fitnessGoal: opt,
      emergencyContactName: opt.max(100),
      emergencyContactPhone: opt.refine((v) => v === '' || phoneOk(v), m.phone),
      emergencyContactRelation: opt.max(50),
      idProofType: opt,
      idProofNumber: opt.max(30),
      /** '' = auto-generate on save. */
      memberCode: opt.refine((v) => v === '' || isValidCode(v), m.code),
      joiningDate: z.string().min(1, m.required),
      branchId: z.string().nullable(),
      assignedTrainerId: z.string().nullable(),
      source: opt,
      referredByMemberId: z.string().nullable(),
      notes: opt.max(1000),
    })
    .superRefine((v, ctx) => {
      const id = v.idProofNumber.replace(/\s/g, '');
      if (v.idProofType === 'aadhaar' && id && !/^\d{12}$/.test(id)) ctx.addIssue({ code: 'custom', path: ['idProofNumber'], message: m.aadhaar });
      if (v.idProofType === 'pan' && id && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(id)) ctx.addIssue({ code: 'custom', path: ['idProofNumber'], message: m.pan });
    });
}

export type MemberFormValues = z.input<ReturnType<typeof memberFormSchema>>;

export function emptyMemberForm(today: string, branchId: string | null): MemberFormValues {
  return {
    photoUri: null,
    fullName: '',
    phone: '',
    altPhone: '',
    email: '',
    gender: '',
    dateOfBirth: null,
    anniversaryDate: null,
    address: '',
    area: '',
    city: '',
    pincode: '',
    occupation: '',
    bloodGroup: '',
    heightCm: '',
    medicalConditions: '',
    fitnessGoal: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    idProofType: '',
    idProofNumber: '',
    memberCode: '',
    joiningDate: today,
    branchId,
    assignedTrainerId: null,
    source: '',
    referredByMemberId: null,
    notes: '',
  };
}

/** Stored phone → what the phone field shows (digits without the country code). */
export function localPhone(stored: string | null, countryCode: string): string {
  if (!stored) return '';
  const cc = countryCode.replace(/\D/g, '');
  return stored.startsWith(cc) && stored.length - cc.length === 10 ? stored.slice(cc.length) : stored;
}

export function memberToForm(member: Member, countryCode: string): MemberFormValues {
  const s = (v: string | null) => v ?? '';
  return {
    photoUri: member.photoUri,
    fullName: member.fullName,
    phone: localPhone(member.phone, countryCode),
    altPhone: localPhone(member.altPhone, countryCode),
    email: s(member.email),
    gender: member.gender ?? '',
    dateOfBirth: member.dateOfBirth,
    anniversaryDate: member.anniversaryDate,
    address: s(member.address),
    area: s(member.area),
    city: s(member.city),
    pincode: s(member.pincode),
    occupation: s(member.occupation),
    bloodGroup: s(member.bloodGroup),
    heightCm: member.heightCm == null ? '' : String(member.heightCm),
    medicalConditions: s(member.medicalConditions),
    fitnessGoal: s(member.fitnessGoal),
    emergencyContactName: s(member.emergencyContactName),
    emergencyContactPhone: localPhone(member.emergencyContactPhone, countryCode),
    emergencyContactRelation: s(member.emergencyContactRelation),
    idProofType: s(member.idProofType),
    idProofNumber: s(member.idProofNumber),
    memberCode: member.memberCode,
    joiningDate: member.joiningDate,
    branchId: member.branchId,
    assignedTrainerId: member.assignedTrainerId,
    source: s(member.source),
    referredByMemberId: member.referredByMemberId,
    notes: s(member.notes),
  };
}

/** Form → member columns (phones normalised to digits incl. country code, §6.9). */
export function formToMember(v: MemberFormValues, countryCode: string): Omit<NewRow<Member>, 'memberCode' | 'createdBy' | 'biometricId'> & { memberCode: string | null } {
  const n = (x: string) => x.trim() || null;
  const phone = (x: string) => (x.trim() ? normalizePhone(x, countryCode) : null);
  return {
    photoUri: v.photoUri,
    fullName: v.fullName.trim().replace(/\s+/g, ' '),
    phone: normalizePhone(v.phone, countryCode),
    altPhone: phone(v.altPhone),
    email: n(v.email),
    gender: v.gender || null,
    dateOfBirth: v.dateOfBirth,
    anniversaryDate: v.anniversaryDate,
    address: n(v.address),
    area: n(v.area),
    city: n(v.city),
    pincode: n(v.pincode),
    occupation: n(v.occupation),
    bloodGroup: n(v.bloodGroup),
    heightCm: v.heightCm.trim() ? Number(v.heightCm) : null,
    medicalConditions: n(v.medicalConditions),
    fitnessGoal: (v.fitnessGoal || null) as FitnessGoal | null,
    emergencyContactName: n(v.emergencyContactName),
    emergencyContactPhone: phone(v.emergencyContactPhone),
    emergencyContactRelation: n(v.emergencyContactRelation),
    idProofType: n(v.idProofType),
    idProofNumber: v.idProofNumber.trim() ? v.idProofNumber.replace(/\s/g, '').toUpperCase() : null,
    memberCode: v.memberCode.trim() ? v.memberCode.trim().toUpperCase() : null,
    joiningDate: v.joiningDate,
    branchId: v.branchId,
    assignedTrainerId: v.assignedTrainerId,
    source: (v.source || null) as LeadSource | null,
    referredByMemberId: v.referredByMemberId,
    notes: n(v.notes),
  };
}
