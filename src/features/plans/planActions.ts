// Plan writes (§10.3). Each is one transaction with an audit entry; `writeTransaction`
// bumps dataVersion so lists refresh. Editing a plan never touches existing subscriptions —
// they keep their own name/price snapshots (§10.3, §5.2).
import { getDb, writeTransaction } from '@/db/client';
import type { Plan, PlanCategory } from '@/db/models';
import { plansRepo, writeAudit } from '@/db/repositories';
import { listPlansWithCounts, nextPlanSortOrder, setPlanSortOrders } from '@/db/repositories/plans';
import { todayISO } from '@/domain/dates';
import { reorderPlans } from '@/domain/plans';

import type { PlanInput } from './planSchema';

export const loadPlans = (category: PlanCategory) => listPlansWithCounts(getDb(), category, todayISO());
export const loadPlan = (id: string) => plansRepo.getById(getDb(), id);

export async function savePlan(input: PlanInput, id?: string): Promise<Plan> {
  return writeTransaction(async (tx) => {
    if (id) {
      const before = await plansRepo.getById(tx, id);
      if (!before) throw new Error('Plan not found');
      // Moving a plan to another category puts it at the end of that list.
      const sortOrder = before.category === input.category ? before.sortOrder : await nextPlanSortOrder(tx, input.category);
      const plan = await plansRepo.update(tx, id, { ...input, sortOrder });
      await writeAudit(tx, { action: 'plan.update', entity: 'plan', entityId: id, summary: `Edited plan ${plan.name}` });
      return plan;
    }
    const plan = await plansRepo.create(tx, { ...input, isActive: true, sortOrder: await nextPlanSortOrder(tx, input.category) });
    await writeAudit(tx, { action: 'plan.create', entity: 'plan', entityId: plan.id, summary: `Added plan ${plan.name}` });
    return plan;
  });
}

export function setPlanActive(plan: Pick<Plan, 'id' | 'name'>, isActive: boolean): Promise<void> {
  return writeTransaction(async (tx) => {
    await plansRepo.update(tx, plan.id, { isActive });
    await writeAudit(tx, {
      action: isActive ? 'plan.activate' : 'plan.deactivate',
      entity: 'plan',
      entityId: plan.id,
      summary: `${isActive ? 'Activated' : 'Deactivated'} plan ${plan.name}`,
    });
  });
}

/** Soft delete — subscriptions keep their history (the FK stays valid). */
export function deletePlan(plan: Pick<Plan, 'id' | 'name'>): Promise<void> {
  return writeTransaction(async (tx) => {
    await plansRepo.softDelete(tx, plan.id);
    await writeAudit(tx, { action: 'plan.delete', entity: 'plan', entityId: plan.id, summary: `Deleted plan ${plan.name}` });
  });
}

export function movePlan(plans: Pick<Plan, 'id' | 'sortOrder' | 'name'>[], id: string, direction: 'up' | 'down'): Promise<void> {
  return writeTransaction((tx) => setPlanSortOrders(tx, reorderPlans(plans, id, direction)));
}
