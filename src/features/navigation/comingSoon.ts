import { router } from 'expo-router';

/** Opens the "Coming in Mxx" placeholder for a feature owned by a later milestone
 * (roadmap Wire-up register). Every call site must carry a `TODO(Mxx)` comment. */
export function openComingSoon(milestone: string, title: string): void {
  router.push({ pathname: '/coming-soon', params: { milestone, title } });
}
