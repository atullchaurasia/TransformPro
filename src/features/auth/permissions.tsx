import type { ReactNode } from 'react';

import { can, type PermissionKey } from '@/domain/permissions';
import { useCurrentStaff } from '@/store/sessionStore';

/** True if the logged-in staff member has `permission` (§15). */
export function useCan(permission: PermissionKey): boolean {
  return can(useCurrentStaff(), permission);
}

/** Renders children only when allowed — UI the user can't use is hidden, not disabled (§15). */
export function Can({ permission, children, fallback = null }: { permission: PermissionKey; children: ReactNode; fallback?: ReactNode }) {
  return useCan(permission) ? children : fallback;
}

export const MASK = '••••';

/**
 * Revenue / collection numbers for staff without `reports.financial` show "••••" (§8).
 * Usage: `const mask = useMasked(); mask(formatPaise(total))`.
 */
export function useMasked(): (value: string) => string {
  const allowed = useCan('reports.financial');
  return (value) => (allowed ? value : MASK);
}
