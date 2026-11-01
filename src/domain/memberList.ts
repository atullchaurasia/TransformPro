// Members list: per-member summary, filters and sorting (spec §10.2 list). Pure — the
// repository loads rows in bulk and this turns them into what the list shows.
import { differenceInYears } from 'date-fns';

import type { Gender, ISODate, Member, Paise, Subscription } from '@/db/models';

import { parseDay } from './dates';
import { dueFromNet } from './dues';
import { computeMemberStatus, type MembershipStatus, type StatusFreeze, type StatusSettings, type StatusSubscription } from './membershipStatus';

export type MemberListRow = Pick<
  Member,
  | 'id'
  | 'memberCode'
  | 'fullName'
  | 'phone'
  | 'photoUri'
  | 'gender'
  | 'dateOfBirth'
  | 'anniversaryDate'
  | 'joiningDate'
  | 'createdAt'
  | 'branchId'
  | 'assignedTrainerId'
>;

export type ListSubscription = StatusSubscription & Pick<Subscription, 'memberId' | 'planId' | 'totalPaise'>;

export type MemberSummary = MemberListRow & {
  status: MembershipStatus;
  daysLeft: number | null;
  daysSinceExpiry: number | null;
  planName: string | null;
  /** Plan of the membership the status is about (for the Plan filter). */
  planId: string | null;
  /** Last day of cover (current run) or of the most recent membership. */
  expiryDate: ISODate | null;
  duePaise: Paise;
  hasActivePT: boolean;
  trainerId: string | null;
  lastVisit: ISODate | null;
};

export type SummaryInput = {
  members: MemberListRow[];
  subscriptions: ListSubscription[];
  openFreezes: (StatusFreeze & { memberId: string })[];
  /** subscription id → payments − refunds. */
  netPaidBySubscription: Map<string, Paise>;
  /** member id → unapplied advance. */
  advanceByMember: Map<string, Paise>;
  lastVisitByMember: Map<string, ISODate>;
  today: ISODate;
  settings: StatusSettings;
};

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export function buildMemberSummaries(input: SummaryInput): MemberSummary[] {
  const subsByMember = groupBy(input.subscriptions, (s) => s.memberId);
  const freezesByMember = groupBy(input.openFreezes, (f) => f.memberId);

  return input.members.map((m) => {
    const subs = subsByMember.get(m.id) ?? [];
    const status = computeMemberStatus(subs, freezesByMember.get(m.id) ?? [], input.today, input.settings, m.assignedTrainerId);
    const ms = status.membership;
    const current = ms.subscription ? subs.find((s) => s.id === ms.subscription?.id) : undefined;
    const gross = subs.reduce((sum, s) => sum + dueFromNet(s, input.netPaidBySubscription.get(s.id) ?? 0), 0);
    const pt = status.personalTraining.status;
    return {
      ...m,
      status: ms.status,
      daysLeft: ms.daysLeft,
      daysSinceExpiry: ms.daysSinceExpiry,
      planName: ms.planName,
      planId: current?.planId ?? null,
      expiryDate: ms.coveredUntil ?? ms.subscription?.endDate ?? null,
      duePaise: Math.max(0, gross - (input.advanceByMember.get(m.id) ?? 0)),
      hasActivePT: pt === 'active' || pt === 'expiring' || pt === 'frozen',
      trainerId: status.trainerId,
      lastVisit: input.lastVisitByMember.get(m.id) ?? null,
    };
  });
}

export type StatusFilter = 'all' | 'active' | 'expiring' | 'expired' | 'frozen' | 'upcoming' | 'noPlan';

export type MemberFilters = {
  status: StatusFilter;
  hasDues: boolean;
  birthdayThisMonth: boolean;
  ptMembers: boolean;
  gender: Gender | null;
  planIds: string[];
  trainerId: string | null;
  branchId: string | null;
  joinedFrom: ISODate | null;
  joinedTo: ISODate | null;
};

export const NO_FILTERS: MemberFilters = {
  status: 'all',
  hasDues: false,
  birthdayThisMonth: false,
  ptMembers: false,
  gender: null,
  planIds: [],
  trainerId: null,
  branchId: null,
  joinedFrom: null,
  joinedTo: null,
};

/**
 * Chip → statuses. "Active" includes Expiring soon (they are still active); "Expired"
 * includes In grace (past their end date, even though they may still check in).
 */
const STATUS_GROUPS: Record<Exclude<StatusFilter, 'all'>, MembershipStatus[]> = {
  active: ['active', 'expiring'],
  expiring: ['expiring'],
  expired: ['expired', 'grace'],
  frozen: ['frozen'],
  upcoming: ['upcoming'],
  noPlan: ['noPlan'],
};

export function isBirthdayInMonth(dateOfBirth: ISODate | null, today: ISODate): boolean {
  return !!dateOfBirth && dateOfBirth.slice(5, 7) === today.slice(5, 7);
}

/** Number of filters applied besides the status chip (for the "Filters (3)" button). */
export function activeFilterCount(f: MemberFilters): number {
  return (
    Number(f.hasDues) +
    Number(f.birthdayThisMonth) +
    Number(f.ptMembers) +
    Number(f.gender !== null) +
    Number(f.planIds.length > 0) +
    Number(f.trainerId !== null) +
    Number(f.branchId !== null) +
    Number(f.joinedFrom !== null || f.joinedTo !== null)
  );
}

export function filterMembers(list: MemberSummary[], f: MemberFilters, today: ISODate): MemberSummary[] {
  const statuses = f.status === 'all' ? null : STATUS_GROUPS[f.status];
  return list.filter(
    (m) =>
      (!statuses || statuses.includes(m.status)) &&
      (!f.hasDues || m.duePaise > 0) &&
      (!f.birthdayThisMonth || isBirthdayInMonth(m.dateOfBirth, today)) &&
      (!f.ptMembers || m.hasActivePT) &&
      (!f.gender || m.gender === f.gender) &&
      (f.planIds.length === 0 || (m.planId !== null && f.planIds.includes(m.planId))) &&
      (!f.trainerId || m.trainerId === f.trainerId) &&
      (!f.branchId || m.branchId === f.branchId) &&
      (!f.joinedFrom || m.joiningDate >= f.joinedFrom) &&
      (!f.joinedTo || m.joiningDate <= f.joinedTo),
  );
}

export type MemberSort = 'name' | 'newest' | 'expiry' | 'due' | 'lastVisit';

const byName = (a: MemberSummary, b: MemberSummary) => a.fullName.localeCompare(b.fullName, 'en', { sensitivity: 'base' });
/** Nulls always go last, whatever the direction. */
const nullsLast = <T>(a: T | null, b: T | null, cmp: (x: T, y: T) => number) => (a === null ? (b === null ? 0 : 1) : b === null ? -1 : cmp(a, b));

export function sortMembers(list: MemberSummary[], sort: MemberSort): MemberSummary[] {
  const out = [...list];
  switch (sort) {
    case 'name':
      return out.sort(byName);
    case 'newest':
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b));
    case 'expiry':
      return out.sort((a, b) => nullsLast(a.expiryDate, b.expiryDate, (x, y) => x.localeCompare(y)) || byName(a, b));
    case 'due':
      return out.sort((a, b) => b.duePaise - a.duePaise || byName(a, b));
    case 'lastVisit':
      return out.sort((a, b) => nullsLast(a.lastVisit, b.lastVisit, (x, y) => y.localeCompare(x)) || byName(a, b));
  }
}

export function ageOn(dateOfBirth: ISODate | null, today: ISODate): number | null {
  if (!dateOfBirth) return null;
  const age = differenceInYears(parseDay(today), parseDay(dateOfBirth));
  return age >= 0 && age < 130 ? age : null;
}

/** Aadhaar numbers show only the last 4 digits in lists (§10.2): "XXXX XXXX 1234". */
export function maskIdNumber(type: string | null, number: string | null): string {
  if (!number) return '';
  if (type !== 'aadhaar') return number;
  const digits = number.replace(/\D/g, '');
  return `XXXX XXXX ${digits.slice(-4)}`;
}
