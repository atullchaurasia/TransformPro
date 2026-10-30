import { DoneStep } from '@/features/onboarding/DoneStep';
import { GymStep } from '@/features/onboarding/GymStep';
import { OwnerStep } from '@/features/onboarding/OwnerStep';
import { PlansStep } from '@/features/onboarding/PlansStep';
import { PreferencesStep } from '@/features/onboarding/PreferencesStep';
import { RestoreStep } from '@/features/onboarding/RestoreStep';
import { WelcomeStep } from '@/features/onboarding/WelcomeStep';
import { useOnboardingStore } from '@/features/onboarding/onboardingStore';

const STEPS = [WelcomeStep, GymStep, OwnerStep, PreferencesStep, PlansStep, RestoreStep, DoneStep];

/** First-run setup wizard (spec §7), shown while `onboarding_complete = false`. */
export default function OnboardingScreen() {
  const step = useOnboardingStore((s) => s.step);
  const Step = STEPS[step] ?? WelcomeStep;
  return <Step />;
}
