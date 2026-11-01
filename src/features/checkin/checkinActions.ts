// Check-in reads/writes for screens (§10.4, §6.8). Screens → these → repositories.
import { getDb, writeTransaction } from '@/db/client';
import type { Attendance, CheckinMethod, Member } from '@/db/models';
import {
  autoCheckout,
  checkIn,
  checkOut,
  deleteVisit,
  findMemberByCode,
  listMemberVisits,
  listRecentVisitors,
  listVisitsBetween,
  listVisitsOn,
  type AttendanceRow,
} from '@/db/repositories/attendance';
import { loadMemberListData } from '@/db/repositories/members';
import { absentees } from '@/domain/attendance';
import { evaluateCheckin, type CheckinDecision } from '@/domain/checkin';
import { parseMemberQr } from '@/domain/codes';
import { formatDay, todayISO } from '@/domain/dates';
import { buildMemberSummaries } from '@/domain/memberList';
import type { StatusResult } from '@/domain/membershipStatus';
import { can } from '@/domain/permissions';
import { loadProfile } from '@/features/profile/profileActions';
import { getCurrentStaff, getCurrentStaffId } from '@/store/sessionStore';
import { getSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

export type CheckinCheck = {
  member: Member;
  membership: StatusResult;
  duePaise: number;
  decision: CheckinDecision;
  /** Today's open visit (for "Already inside since …"). */
  openVisit: Attendance | null;
};

/** Runs the §6.8 rules for one member without writing anything. */
export async function prepareCheckin(memberId: string): Promise<CheckinCheck | null> {
  const profile = await loadProfile(memberId);
  if (!profile || profile.member.deletedAt) return null;
  const s = getSettings();
  const todayVisits = await listVisitsOn(getDb(), memberId, profile.today);
  const membership = profile.summary.status.membership;
  const duePaise = profile.summary.dues.totalDuePaise;
  const decision = evaluateCheckin({
    membership,
    duePaise,
    todayVisits,
    settings: { blockExpired: s.checkin_block_expired, blockDues: s.checkin_block_dues, allowMultiplePerDay: s.allow_multiple_checkins_per_day },
    canOverride: can(getCurrentStaff(), 'attendance.override_block'),
  });
  return { member: profile.member, membership, duePaise, decision, openVisit: todayVisits.find((v) => v.checkOutAt == null) ?? null };
}

export type ScanLookup = { ok: true; check: CheckinCheck } | { ok: false; reason: 'not_ours' | 'unknown_member' };

/** QR payload `TRANSFORMPRO:<member_code>` → member → rules. */
export async function prepareCheckinFromQr(payload: string): Promise<ScanLookup> {
  const code = parseMemberQr(payload);
  if (!code) return { ok: false, reason: 'not_ours' };
  const member = await findMemberByCode(getDb(), code);
  const check = member ? await prepareCheckin(member.id) : null;
  return check ? { ok: true, check } : { ok: false, reason: 'unknown_member' };
}

/** Records the check-in the rules allowed (or an override with its reason). */
export function performCheckin(check: CheckinCheck, method: CheckinMethod, overrideReason?: string): Promise<Attendance> {
  const d = check.decision;
  if (d.kind === 'check_out') throw new Error('Member is already inside');
  if (d.kind === 'blocked' && (!d.overridable || !overrideReason?.trim())) throw new Error('Check-in is blocked');
  const sub = check.membership.subscription;
  const now = new Date();
  return writeTransaction((tx) =>
    checkIn(tx, {
      member: check.member,
      date: formatDay(now),
      at: now.toISOString(),
      method,
      // Session plans are only linked when a session is used, so deleting the visit returns it.
      subscriptionId: sub && sub.sessionsTotal == null ? sub.id : null,
      consumeSessionOf: d.consumeSessionOf,
      markedBy: getCurrentStaffId(),
      override: d.kind === 'blocked' ? { reason: overrideReason ?? '', blockedFor: d.reasons } : null,
    }),
  );
}

export function performCheckout(visit: Pick<Attendance, 'id' | 'checkInAt'>) {
  return writeTransaction((tx) => checkOut(tx, visit, new Date().toISOString()));
}

export function deleteAttendance(row: AttendanceRow) {
  return writeTransaction((tx) => deleteVisit(tx, row, row.memberName));
}

/** On app open (§6.8). Never throws — one failure must not block start-up (§13). */
export async function autoCheckoutSafely(now = new Date()): Promise<number> {
  try {
    const hours = getSettings().auto_checkout_hours;
    return await writeTransaction((tx) => autoCheckout(tx, now, hours));
  } catch (e) {
    logger.error('Auto check-out failed', e);
    return 0;
  }
}

export const loadVisitsBetween = (from: string, to: string) => listVisitsBetween(getDb(), from, to);
export const loadRecentVisitors = () => listRecentVisitors(getDb());
export const loadMemberVisits = (memberId: string) => listMemberVisits(getDb(), memberId);

/** Active members not seen for `days` days (§10.4 Absentees). */
export async function loadAbsentees(days: number) {
  const data = await loadMemberListData(getDb());
  const s = getSettings();
  const today = todayISO();
  const summaries = buildMemberSummaries({ ...data, today, settings: { expiringSoonDays: s.expiring_soon_days, gracePeriodDays: s.grace_period_days } });
  return absentees(summaries, data.lastVisitByMember, today, days);
}

