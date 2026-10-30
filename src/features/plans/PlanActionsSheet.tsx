import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheet, ListRow } from '@/components';
import type { PlanWithCount } from '@/db/repositories/plans';
import { confirm, toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { deletePlan, setPlanActive } from './planActions';

/** Edit / Deactivate / Delete for one plan. Only shown to staff with `plans.manage`. */
export function PlanActionsSheet({ plan, onClose }: { plan: PlanWithCount | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const run = async (task: () => Promise<void>, success: string) => {
    onClose();
    try {
      await task();
      toast.success(success);
    } catch (e) {
      logger.error('Plan action failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  const toggleActive = (p: PlanWithCount) =>
    run(() => setPlanActive(p, !p.isActive), p.isActive ? t('plans.deactivated', { name: p.name }) : t('plans.activated', { name: p.name }));

  const remove = async (p: PlanWithCount) => {
    const ok = await confirm({
      title: t('plans.deleteTitle', { name: p.name }),
      message: p.activeMembers > 0 ? t('plans.deleteInUse', { count: p.activeMembers }) : t('plans.deleteMessage'),
      destructive: true,
      confirmLabel: t('common.delete'),
    });
    if (ok) await run(() => deletePlan(p), t('plans.deleted', { name: p.name }));
  };

  return (
    <BottomSheet visible={plan !== null} onClose={onClose} title={plan?.name}>
      {plan ? (
        <View>
          <ListRow
            title={t('common.edit')}
            icon="create-outline"
            iconBackground={colors.info}
            onPress={() => {
              onClose();
              router.push({ pathname: '/plans/edit', params: { id: plan.id } });
            }}
          />
          <ListRow
            title={plan.isActive ? t('plans.deactivate') : t('plans.activate')}
            subtitle={plan.isActive ? t('plans.deactivateHint') : undefined}
            icon={plan.isActive ? 'eye-off-outline' : 'eye-outline'}
            iconBackground={colors.warning}
            onPress={() => toggleActive(plan)}
          />
          <ListRow title={t('common.delete')} icon="trash-outline" iconBackground={colors.danger} destructive onPress={() => remove(plan)} />
        </View>
      ) : null}
    </BottomSheet>
  );
}
