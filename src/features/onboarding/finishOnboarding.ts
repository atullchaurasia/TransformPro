import { writeTransaction } from '@/db/client';
import { completeOnboarding } from '@/db/repositories/onboarding';
import { todayISO } from '@/domain/dates';
import { normalizePhone } from '@/domain/phones';
import { createPinHash } from '@/services/auth';
import { clearLockout, writeLockSettings } from '@/services/secureStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useSettingsStore } from '@/store/settingsStore';

import { signIn } from '../auth/session';

import { currencySymbol, useOnboardingStore } from './onboardingStore';

/** Step 7 — saves the whole wizard in one transaction, then signs the owner in (§7). */
export async function finishOnboarding(): Promise<void> {
  const { gym, owner, preferences, plans } = useOnboardingStore.getState();
  const { language } = usePreferencesStore.getState();
  const cc = preferences.countryCode;
  const { pinHash, pinSalt } = await createPinHash(owner.pin);

  const created = await writeTransaction((tx) =>
    completeOnboarding(tx, {
      gym: { ...gym, phone: gym.phone ? normalizePhone(gym.phone, cc) : '' },
      owner: { name: owner.name, phone: normalizePhone(owner.phone, cc), pinHash, pinSalt },
      preferences: {
        currency_code: preferences.currencyCode,
        currency_symbol: currencySymbol(preferences.currencyCode),
        country_code: cc,
        date_format: preferences.dateFormat,
        expiring_soon_days: preferences.expiringSoonDays,
        grace_period_days: preferences.graceDays,
        language,
        biometric_enabled: owner.biometric,
      },
      plans: plans.map(({ key: _key, ...p }) => p),
      today: todayISO(),
    }),
  );

  await writeLockSettings({ lockEnabled: true, lockAfterMinutes: 1, biometricEnabled: owner.biometric });
  await clearLockout();
  // Sign in before refreshing settings, so the route guards go straight to the tabs
  // instead of flashing the lock screen.
  await signIn(created, 'pin');
  await useSettingsStore.getState().hydrate();
  // TODO(M15): schedule local notifications (daily summary, backup reminder) here.
  useOnboardingStore.getState().reset();
}
