import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionSheet } from '@/components';
import type { PlanWithCount } from '@/db/repositories/plans';
import { confirm, toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { deletePlan, setPlanActive } from './planActions';

type Action = 'edit' | 'toggle' | 'delete';

/**
 * Edit / Deactivate / Delete for one plan. Only shown to staff with `plans.manage`. Actions
 * run after the sheet has closed, so the delete confirmation can be presented (iOS).
 */
export function PlanActionsSheet({ plan, onClose }: { plan: PlanWithCount | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Keep the last plan on screen while the sheet animates away.
  const [shown, setShown] = useState<PlanWithCount | null>(plan);
  if (plan && plan !== shown) setShown(plan);

  const run = async (task: () => Promise<void>, success: string) => {
    try {
      await task();
      toast.success(success);
    } catch (e) {
      logger.error('Plan action failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  const remove = async (p: PlanWithCount) => {
    const ok = await confirm({
      title: t('plans.deleteTitle', { name: p.name }),
      message: p.activeMembers > 0 ? t('plans.deleteInUse', { count: p.activeMembers }) : t('plans.deleteMessage'),
      destructive: true,
      confirmLabel: t('common.delete'),
    });
    if (ok) await run(() => deletePlan(p), t('plans.deleted', { name: p.name }));
  };

  const onSelect = (a: Action) => {
    const p = shown;
    if (!p) return;
    if (a === 'edit') return router.push({ pathname: '/plans/edit', params: { id: p.id } });
    if (a === 'toggle') return void run(() => setPlanActive(p, !p.isActive), p.isActive ? t('plans.deactivated', { name: p.name }) : t('plans.activated', { name: p.name }));
    return void remove(p);
  };

  return (
    <ActionSheet<Action>
      visible={plan !== null}
      onClose={onClose}
      title={shown?.name}
      onSelect={onSelect}
      items={
        shown
          ? [
              { key: 'edit', label: t('common.edit'), icon: 'create-outline', color: colors.info },
              { key: 'toggle', label: shown.isActive ? t('plans.deactivate') : t('plans.activate'), subtitle: shown.isActive ? t('plans.deactivateHint') : undefined, icon: shown.isActive ? 'eye-off-outline' : 'eye-outline', color: colors.warning },
              { key: 'delete', label: t('common.delete'), icon: 'trash-outline', destructive: true },
            ]
          : []
      }
    />
  );
}
