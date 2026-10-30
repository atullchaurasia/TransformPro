// Permission keys and role defaults (spec §15, §10.13). UI the user can't use is hidden.
import type { StaffRole } from '@/db/models';

export const PERMISSION_KEYS = [
  'members.view',
  'members.view_all',
  'members.create',
  'members.edit',
  'members.delete',
  'members.delete_permanent',
  'members.import',
  'members.export',
  'membership.create',
  'membership.renew',
  'membership.freeze',
  'membership.freeze_override',
  'membership.cancel',
  'membership.edit_dates',
  'payments.view',
  'payments.create',
  'payments.refund',
  'payments.delete',
  'attendance.mark',
  'attendance.override_block',
  'attendance.delete',
  'measurements.manage',
  'enquiries.view',
  'enquiries.manage',
  'expenses.view',
  'expenses.manage',
  'reports.view',
  'reports.financial',
  'messages.send',
  'templates.manage',
  'plans.manage',
  'staff.manage',
  'branches.manage',
  'settings.manage',
  'settings.security',
  'backup.create',
  'backup.restore',
  'data.erase',
  'audit.view',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export function isPermissionKey(key: string): key is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(key);
}

/**
 * Manager = everything except staff management, permanent deletes, restore and security
 * (§10.13). Also excluded: `payments.delete` (§13: deleting payments needs the owner) and
 * `data.erase` (wipes everything — owner only). Decisions Log 2026-10-30 M03.
 */
const MANAGER_EXCLUDED: PermissionKey[] = [
  'staff.manage',
  'members.delete_permanent',
  'backup.restore',
  'settings.security',
  'payments.delete',
  'data.erase',
];

/** Members (view/add/edit), check-in, record payments, enquiries, messages. */
const RECEPTIONIST: PermissionKey[] = [
  'members.view',
  'members.view_all',
  'members.create',
  'members.edit',
  'membership.create',
  'membership.renew',
  'payments.view',
  'payments.create',
  'attendance.mark',
  'enquiries.view',
  'enquiries.manage',
  'messages.send',
];

/** Assigned members only (no `members.view_all`), check-in, measurements, PT clients. */
const TRAINER: PermissionKey[] = ['members.view', 'attendance.mark', 'measurements.manage'];

export const ROLE_DEFAULTS: Record<StaffRole, readonly PermissionKey[]> = {
  owner: PERMISSION_KEYS,
  manager: PERMISSION_KEYS.filter((k) => !MANAGER_EXCLUDED.includes(k)),
  receptionist: RECEPTIONIST,
  trainer: TRAINER,
};

export function defaultPermissions(role: StaffRole): PermissionKey[] {
  return [...ROLE_DEFAULTS[role]];
}

/**
 * Reads `staff.permissions` (a JSON array). Unknown keys are dropped; anything that isn't
 * a valid array falls back to the role defaults, so bad data can't lock staff out.
 */
export function parsePermissions(json: string | null | undefined, role: StaffRole): PermissionKey[] {
  if (json) {
    try {
      const parsed: unknown = JSON.parse(json);
      if (Array.isArray(parsed)) return parsed.filter((k): k is PermissionKey => typeof k === 'string' && isPermissionKey(k));
    } catch {
      // fall through to defaults
    }
  }
  return defaultPermissions(role);
}

export function serializePermissions(keys: Iterable<string>): string {
  const unique = new Set([...keys].filter(isPermissionKey));
  return JSON.stringify(PERMISSION_KEYS.filter((k) => unique.has(k)));
}

export type PermissionSubject = { role: StaffRole; permissions: string | null; isActive: boolean } | null | undefined;

/** The owner can always do everything; inactive staff and "nobody logged in" can do nothing. */
export function can(staff: PermissionSubject, key: PermissionKey): boolean {
  if (!staff || !staff.isActive) return false;
  if (staff.role === 'owner') return true;
  return parsePermissions(staff.permissions, staff.role).includes(key);
}

/** Members this staff member may see: all, or only those assigned to them (§10.13 trainers). */
export function memberScope(staff: PermissionSubject): 'all' | 'assigned' | 'none' {
  if (!can(staff, 'members.view')) return 'none';
  return can(staff, 'members.view_all') ? 'all' : 'assigned';
}
