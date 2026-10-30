import { defaultPermissions, serializePermissions } from '@/domain/permissions';
import { SEED_EXPENSE_CATEGORIES, SEED_TEMPLATES, type SeedPlan } from '@/domain/seedData';
import type { AppSettings } from '@/domain/settings';

import type { Staff } from '../models';
import type { Db } from '../types';

import { writeAudit } from './audit';
import { branchesRepo, expenseCategoriesRepo, messageTemplatesRepo, plansRepo, staffRepo } from './index';
import { saveSettings } from './settings';
import { getOwner } from './staff';

export type OnboardingPlan = SeedPlan & { pricePaise: number };

export type OnboardingInput = {
  gym: { name: string; phone: string; address: string; email: string; gstin: string; logoUri: string | null };
  owner: { name: string; phone: string; pinHash: string; pinSalt: string };
  preferences: Pick<AppSettings, 'currency_code' | 'currency_symbol' | 'country_code' | 'date_format' | 'expiring_soon_days' | 'grace_period_days' | 'language' | 'biometric_enabled'>;
  plans: OnboardingPlan[];
  today: string;
};

/**
 * Creates everything a new gym needs, in ONE transaction (call inside `writeTransaction`):
 * default branch, the single owner, plans, expense categories, EN + HI system templates and
 * settings, ending with `onboarding_complete = true`. If any step fails nothing is saved.
 */
export async function completeOnboarding(tx: Db, input: OnboardingInput): Promise<Staff> {
  if (await getOwner(tx)) throw new Error('Onboarding has already been completed');

  const branch = await branchesRepo.create(tx, {
    name: input.gym.name,
    address: input.gym.address || null,
    phone: input.gym.phone || null,
    isActive: true,
  });

  const owner = await staffRepo.create(tx, {
    name: input.owner.name,
    phone: input.owner.phone || null,
    role: 'owner',
    pinHash: input.owner.pinHash,
    pinSalt: input.owner.pinSalt,
    permissions: serializePermissions(defaultPermissions('owner')),
    branchId: null,
    isActive: true,
    salaryPaise: null,
    joinedOn: input.today,
    photoUri: null,
  });

  for (const [i, p] of input.plans.entries()) {
    await plansRepo.create(tx, {
      name: p.name,
      category: p.category,
      durationValue: p.durationValue,
      durationUnit: p.durationUnit,
      sessionCount: null,
      pricePaise: p.pricePaise,
      admissionFeePaise: 0,
      maxFreezeDays: 0,
      maxFreezeTimes: 0,
      color: p.color,
      description: null,
      isActive: true,
      sortOrder: i,
    });
  }

  for (const c of SEED_EXPENSE_CATEGORIES) {
    await expenseCategoriesRepo.create(tx, { name: c.name, icon: c.icon, isActive: true });
  }

  for (const language of ['en', 'hi'] as const) {
    for (const tpl of SEED_TEMPLATES[language]) {
      await messageTemplatesRepo.create(tx, { ...tpl, language, isSystem: true });
    }
  }

  await saveSettings(tx, {
    ...input.preferences,
    gym_name: input.gym.name,
    gym_phone: input.gym.phone,
    gym_address: input.gym.address,
    gym_email: input.gym.email,
    gym_gstin: input.gym.gstin,
    gym_logo_uri: input.gym.logoUri,
    default_branch_id: branch.id,
    lock_enabled: true,
    onboarding_complete: true,
  });

  await writeAudit(tx, {
    action: 'settings.onboarding',
    entity: 'settings',
    summary: `Set up ${input.gym.name} with owner ${input.owner.name}`,
    staffId: owner.id,
  });
  return owner;
}
