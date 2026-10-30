import { Redirect } from 'expo-router';

import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';

// Entry route and the fallback the route guards redirect to: onboarding → lock → dashboard.
export default function Index() {
  const onboarded = useSettingsStore((s) => s.settings.onboarding_complete);
  const locked = useSessionStore((s) => s.locked);
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (locked) return <Redirect href="/lock" />;
  return <Redirect href="/home" />;
}
