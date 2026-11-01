// Member attendance (spec §10.4, §6.8). Writes run in the caller's transaction. Plain check-ins
// aren't audit-logged (there are thousands); overrides, deletions and auto check-outs are.
import { staleCheckins } from '@/domain/checkin';
import type { MemberListRow } from '@/domain/memberList';
import { nowIso } from '@/utils/id';

import type { Attendance, CheckinMethod, ISODate, Member } from '../models';
import type { Db } from '../types';

import { writeAudit } from './audit';
import { attendanceRepo, membersRepo } from './index';

type Row = Record<string, unknown>;

export type AttendanceRow = Attendance & { memberName: string; memberCode: string; memberPhone: string; memberPhotoUri: string | null };

const SELECT = `SELECT a.*, m.full_name AS x_name, m.member_code AS x_code, m.phone AS x_phone, m.photo_uri AS x_photo
  FROM attendance a JOIN members m ON m.id = a.member_id`;

function toRow(r: Row): AttendanceRow {
  const { x_name, x_code, x_phone, x_photo, ...rest } = r;
  return { ...attendanceRepo.fromRow(rest), memberName: String(x_name), memberCode: String(x_code), memberPhone: String(x_phone), memberPhotoUri: (x_photo as string | null) ?? null };
}

/** QR / code lookup: case-insensitive, members in Trash excluded. */
export async function findMemberByCode(db: Db, code: string): Promise<Member | null> {
  const row = await db.getFirstAsync<Row>('SELECT * FROM members WHERE member_code = ? COLLATE NOCASE AND deleted_at IS NULL', [code.trim()]);
  return row ? membersRepo.fromRow(row) : null;
}

export async function listVisitsOn(db: Db, memberId: string, date: ISODate): Promise<Attendance[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM attendance WHERE member_id = ? AND date = ? ORDER BY check_in_at', [memberId, date]);
  return rows.map(attendanceRepo.fromRow);
}

export type CheckinWrite = {
  member: Pick<Member, 'id' | 'fullName' | 'branchId'>;
  date: ISODate;
  at: string;
  method: CheckinMethod;
  /**
   * The date-based plan that covers the visit. Never a session plan unless a session was used
   * (`consumeSessionOf`): deleting the visit gives back a session only for session plans.
   */
  subscriptionId: string | null;
  /** Session plans: this subscription's `sessions_used` goes up by one (§6.8). */
  consumeSessionOf: string | null;
  markedBy: string | null;
  /** Owner/manager let a blocked member in (§6.8): logged with the reason. */
  override: { reason: string; blockedFor: string[] } | null;
};

export async function checkIn(tx: Db, w: CheckinWrite): Promise<Attendance> {
  if (w.consumeSessionOf) {
    await tx.runAsync('UPDATE subscriptions SET sessions_used = sessions_used + 1, updated_at = ? WHERE id = ?', [nowIso(), w.consumeSessionOf]);
  }
  const visit = await attendanceRepo.create(tx, {
    memberId: w.member.id,
    branchId: w.member.branchId,
    date: w.date,
    checkInAt: w.at,
    checkOutAt: null,
    method: w.method,
    subscriptionId: w.consumeSessionOf ?? w.subscriptionId,
    markedBy: w.markedBy,
  });
  if (w.override) {
    await writeAudit(tx, {
      action: 'attendance.override',
      entity: 'member',
      entityId: w.member.id,
      summary: `${w.member.fullName}: checked in despite ${w.override.blockedFor.join(', ')} — ${w.override.reason.trim()}`,
    });
  }
  return visit;
}

export async function checkOut(tx: Db, visit: Pick<Attendance, 'id' | 'checkInAt'>, at: string): Promise<void> {
  // The table forbids a check-out before the check-in.
  const out = at < visit.checkInAt ? visit.checkInAt : at;
  await tx.runAsync('UPDATE attendance SET check_out_at = ?, updated_at = ? WHERE id = ? AND check_out_at IS NULL', [out, nowIso(), visit.id]);
}

/** Delete a wrong entry (manager+). A session it used is given back. */
export async function deleteVisit(tx: Db, visit: Pick<Attendance, 'id' | 'subscriptionId' | 'date' | 'memberId'>, memberName: string): Promise<void> {
  if (visit.subscriptionId) {
    await tx.runAsync(
      'UPDATE subscriptions SET sessions_used = MAX(0, sessions_used - 1), updated_at = ? WHERE id = ? AND sessions_total IS NOT NULL',
      [nowIso(), visit.subscriptionId],
    );
  }
  await attendanceRepo.hardDelete(tx, visit.id);
  await writeAudit(tx, { action: 'attendance.delete', entity: 'member', entityId: visit.memberId, summary: `${memberName}: deleted the check-in of ${visit.date}` });
}

/** Closes open check-ins older than `hours` (§6.8, on app open). Returns how many. */
export async function autoCheckout(tx: Db, now: Date, hours: number): Promise<number> {
  const open = (await tx.getAllAsync<Row>('SELECT id, check_in_at, check_out_at FROM attendance WHERE check_out_at IS NULL', [])).map(attendanceRepo.fromRow);
  const stale = staleCheckins(open, now, hours);
  for (const s of stale) await tx.runAsync('UPDATE attendance SET check_out_at = ?, updated_at = ? WHERE id = ?', [s.checkOutAt, nowIso(), s.id]);
  if (stale.length > 0) {
    await writeAudit(tx, { action: 'attendance.auto_checkout', entity: 'attendance', summary: `Auto check-out of ${stale.length} visit(s) after ${hours} h`, staffId: null });
  }
  return stale.length;
}

/** Visits in a date range (today's list, history), newest first. */
export async function listVisitsBetween(db: Db, from: ISODate, to: ISODate): Promise<AttendanceRow[]> {
  const rows = await db.getAllAsync<Row>(`${SELECT} WHERE a.date BETWEEN ? AND ? AND m.deleted_at IS NULL ORDER BY a.check_in_at DESC`, [from, to]);
  return rows.map(toRow);
}

export async function listMemberVisits(db: Db, memberId: string): Promise<Attendance[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM attendance WHERE member_id = ? ORDER BY check_in_at DESC', [memberId]);
  return rows.map(attendanceRepo.fromRow);
}

/** "Recent members" for Search & mark: whoever checked in most recently. */
export async function listRecentVisitors(db: Db, limit = 15): Promise<MemberListRow[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT m.id, m.member_code, m.full_name, m.phone, m.photo_uri, m.gender, m.date_of_birth, m.anniversary_date, m.joining_date, m.created_at, m.branch_id, m.assigned_trainer_id
     FROM attendance a JOIN members m ON m.id = a.member_id
     WHERE m.deleted_at IS NULL GROUP BY m.id ORDER BY MAX(a.check_in_at) DESC LIMIT ${Math.trunc(limit)}`,
    [],
  );
  return rows.map((r) => membersRepo.fromRow(r) as unknown as MemberListRow);
}
