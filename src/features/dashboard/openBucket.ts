import { router } from 'expo-router';

import type { MemberBucket } from '@/domain/dashboard';

/** Opens the member list behind a dashboard card (§10.1 "tap each to open the filtered list"). */
export function openBucket(bucket: MemberBucket) {
  router.push({ pathname: '/home/list', params: { bucket } });
}
