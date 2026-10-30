import { Redirect } from 'expo-router';

// Entry route. M04 routes to onboarding or the lock screen first.
export default function Index() {
  return <Redirect href="/home" />;
}
