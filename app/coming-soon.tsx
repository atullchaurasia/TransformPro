import { Stack, useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '@/components';

export default function ComingSoonScreen() {
  const { milestone, title } = useLocalSearchParams<{ milestone?: string; title?: string }>();
  return (
    <>
      {title ? <Stack.Screen options={{ title }} /> : null}
      <ComingSoon milestone={milestone ?? '—'} title={title} />
    </>
  );
}
