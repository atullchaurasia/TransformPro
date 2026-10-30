import { create } from 'zustand';

import type { OnboardingPlan } from '@/db/repositories/onboarding';
import { SEED_PLANS } from '@/domain/seedData';
import type { DateFormatSetting } from '@/utils/format';

export type GymDraft = { name: string; phone: string; address: string; email: string; gstin: string; logoUri: string | null };
export type OwnerDraft = { name: string; phone: string; pin: string; biometric: boolean };
export type PreferencesDraft = {
  currencyCode: string;
  countryCode: string;
  dateFormat: DateFormatSetting;
  expiringSoonDays: number;
  graceDays: number;
};

export const STEP_COUNT = 7;

type OnboardingState = {
  step: number;
  gym: GymDraft;
  owner: OwnerDraft;
  preferences: PreferencesDraft;
  plans: (OnboardingPlan & { key: string })[];
  setStep: (step: number) => void;
  next: () => void;
  back: () => void;
  setGym: (gym: GymDraft) => void;
  setOwner: (owner: OwnerDraft) => void;
  setPreferences: (p: PreferencesDraft) => void;
  setPlans: (plans: OnboardingState['plans']) => void;
  reset: () => void;
};

const initial = () => ({
  step: 0,
  gym: { name: '', phone: '', address: '', email: '', gstin: '', logoUri: null },
  owner: { name: '', phone: '', pin: '', biometric: false },
  preferences: { currencyCode: 'INR', countryCode: '+91', dateFormat: 'DD/MM/YYYY' as const, expiringSoonDays: 7, graceDays: 0 },
  plans: SEED_PLANS.map((p, i) => ({ ...p, pricePaise: 0, key: `seed-${i}` })),
});

/** Wizard draft — nothing touches the database until the final "Done" step (§7). */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial(),
  setStep: (step) => set({ step }),
  next: () => set((s) => ({ step: Math.min(s.step + 1, STEP_COUNT - 1) })),
  back: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
  setGym: (gym) => set({ gym }),
  setOwner: (owner) => set({ owner }),
  setPreferences: (preferences) => set({ preferences }),
  setPlans: (plans) => set({ plans }),
  reset: () => set(initial()),
}));

export const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'AED', symbol: 'AED' },
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
  { code: 'NPR', symbol: 'रू' },
  { code: 'BDT', symbol: '৳' },
  { code: 'LKR', symbol: 'Rs' },
] as const;

export const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+61', '+65', '+977', '+880', '+94'] as const;

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}
