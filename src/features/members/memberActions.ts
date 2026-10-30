// Member reads/writes for screens (§10.2). Screens → these → repositories. Every write is one
// transaction with audit entries; writeTransaction bumps dataVersion so lists refresh.
import { subDays } from 'date-fns';

import { getDb, writeTransaction } from '@/db/client';
import type { Branch, Member, Staff } from '@/db/models';
import { branchesRepo, membersRepo, staffRepo, writeAudit } from '@/db/repositories';
import { peekNextMemberCode } from '@/db/repositories/codes';
import { createMemberWithPlans, updateMember, type NewMemberInput } from '@/db/repositories/memberCreate';
import {
  deleteMemberPermanently,
  findMembersByPhone,
  listPurgeableMembers,
  listTrashedMembers,
  loadMemberListData,
  searchMembers,
  setTrainerForMembers,
} from '@/db/repositories/members';
import { todayISO } from '@/domain/dates';
import { buildMemberSummaries, type MemberSummary } from '@/domain/memberList';
import { deletePhoto } from '@/services/photos';
import { getSettings } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

export async function loadMemberSummaries(search: string): Promise<MemberSummary[]> {
  const data = await loadMemberListData(getDb(), search);
  const s = getSettings();
  return buildMemberSummaries({
    ...data,
    today: todayISO(),
    settings: { expiringSoonDays: s.expiring_soon_days, gracePeriodDays: s.grace_period_days },
  });
}

export const quickSearchMembers = (q: string) => searchMembers(getDb(), q);
export const loadMember = (id: string) => membersRepo.getById(getDb(), id, { includeDeleted: true });
export const nextMemberCode = () => peekNextMemberCode(getDb());
export const findDuplicatePhones = (phone: string, excludeId?: string) => findMembersByPhone(getDb(), phone, excludeId);

/** Staff who can be assigned as trainers: active, not deleted (trainers first). */
export async function loadTrainerOptions(): Promise<Staff[]> {
  const staff = await staffRepo.list(getDb(), { orderBy: 'name' });
  return staff.filter((s) => s.isActive).sort((a, b) => Number(b.role === 'trainer') - Number(a.role === 'trainer'));
}

export async function loadBranches(): Promise<Branch[]> {
  return (await branchesRepo.list(getDb(), { orderBy: 'name' })).filter((b) => b.isActive);
}

export const createMember = (input: NewMemberInput) => writeTransaction((tx) => createMemberWithPlans(tx, input));

export const saveMemberEdits = (id: string, patch: Parameters<typeof updateMember>[2]) => writeTransaction((tx) => updateMember(tx, id, patch));

export function moveMembersToTrash(members: Pick<Member, 'id' | 'fullName'>[]): Promise<void> {
  return writeTransaction(async (tx) => {
    for (const m of members) {
      await membersRepo.softDelete(tx, m.id);
      await writeAudit(tx, { action: 'member.delete', entity: 'member', entityId: m.id, summary: `Moved ${m.fullName} to Trash` });
    }
  });
}

export function assignTrainer(members: Pick<Member, 'id'>[], trainer: Pick<Staff, 'id' | 'name'> | null): Promise<void> {
  return writeTransaction(async (tx) => {
    await setTrainerForMembers(tx, members.map((m) => m.id), trainer?.id ?? null);
    await writeAudit(tx, {
      action: 'member.update',
      entity: 'member',
      summary: trainer ? `Assigned ${trainer.name} as trainer to ${members.length} member(s)` : `Removed trainer from ${members.length} member(s)`,
    });
  });
}

// ---- Trash ----

export const loadTrashedMembers = () => listTrashedMembers(getDb());

export function restoreMember(m: Pick<Member, 'id' | 'fullName'>): Promise<void> {
  return writeTransaction(async (tx) => {
    await membersRepo.restore(tx, m.id);
    await writeAudit(tx, { action: 'member.restore', entity: 'member', entityId: m.id, summary: `Restored ${m.fullName} from Trash` });
  });
}

export async function deleteMembersForever(members: Pick<Member, 'id' | 'fullName' | 'memberCode' | 'photoUri'>[], reason: 'manual' | 'auto_purge'): Promise<void> {
  await writeTransaction(async (tx) => {
    for (const m of members) {
      await deleteMemberPermanently(tx, m.id);
      await writeAudit(tx, {
        action: 'member.delete_permanent',
        entity: 'member',
        entityId: m.id,
        summary: `${reason === 'auto_purge' ? 'Auto-purged' : 'Permanently deleted'} ${m.fullName} (${m.memberCode})`,
      });
    }
  });
  // Photos go only after the rows are gone, so a failed delete never loses a photo.
  for (const m of members) deletePhoto(m.photoUri);
}

export const TRASH_RETENTION_DAYS = 30;

/** On app open (§10.2): permanently delete members in Trash for more than 30 days. */
export async function purgeOldTrash(now = new Date()): Promise<number> {
  if (!getSettings().trash_auto_purge) return 0;
  try {
    const old = await listPurgeableMembers(getDb(), subDays(now, TRASH_RETENTION_DAYS).toISOString());
    if (old.length > 0) await deleteMembersForever(old, 'auto_purge');
    return old.length;
  } catch (e) {
    logger.error('Trash auto-purge failed', e);
    return 0;
  }
}
