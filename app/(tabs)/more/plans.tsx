import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, ErrorState, SegmentedControl, SkeletonList } from '@/components';
import type { PlanCategory } from '@/db/models';
import type { PlanWithCount } from '@/db/repositories/plans';
import { PLAN_CATEGORIES } from '@/domain/plans';
import { useCan } from '@/features/auth/permissions';
import { HeaderIconButton } from '@/features/navigation/HeaderIconButton';
import { PlanActionsSheet } from '@/features/plans/PlanActionsSheet';
import { PlanRow } from '@/features/plans/PlanRow';
import { movePlan } from '@/features/plans/planActions';
import { usePlans } from '@/features/plans/usePlans';
import { toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

const isCategory = (v: unknown): v is PlanCategory => typeof v === 'string' && (PLAN_CATEGORIES as string[]).includes(v);

/** Plans & Pricing / Personal Training / Services (spec §10.3). */
export default function PlansScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState<PlanCategory>(isCategory(params.category) ? params.category : 'membership');
  const [reordering, setReordering] = useState(false);
  const [actionsFor, setActionsFor] = useState<PlanWithCount | null>(null);
  const canManage = useCan('plans.manage');
  const { plans, failed, reload } = usePlans(category);

  const add = () => router.push({ pathname: '/plans/edit', params: { category } });

  const move = async (id: string, direction: 'up' | 'down') => {
    if (!plans) return;
    try {
      await movePlan(plans, id, direction);
    } catch (e) {
      logger.error('Reorder failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  const body = () => {
    if (failed) return <ErrorState onRetry={reload} />;
    if (!plans) return <SkeletonList rows={4} />;
    if (plans.length === 0) {
      return (
        <EmptyState
          icon="pricetags-outline"
          title={t(`plans.empty.${category}`)}
          message={t('plans.emptyMessage')}
          actionLabel={canManage ? t('plans.add') : undefined}
          onAction={canManage ? add : undefined}
        />
      );
    }
    return (
      <FlatList
        data={plans}
        keyExtractor={(p) => p.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: spacing.lg }} />}
        renderItem={({ item, index }) => (
          <PlanRow
            plan={item}
            onPress={canManage ? () => setActionsFor(item) : undefined}
            reorder={
              reordering
                ? {
                    onUp: index > 0 ? () => move(item.id, 'up') : undefined,
                    onDown: index < plans.length - 1 ? () => move(item.id, 'down') : undefined,
                  }
                : undefined
            }
          />
        )}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: t('more.items.plans'),
          headerLargeTitleEnabled: false,
          headerRight: canManage
            ? () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {plans && plans.length > 1 ? (
                    <Button label={reordering ? t('common.done') : t('plans.reorder')} variant="ghost" size="sm" onPress={() => setReordering((r) => !r)} />
                  ) : null}
                  <HeaderIconButton icon="add" accessibilityLabel={t('plans.add')} onPress={add} />
                </View>
              )
            : undefined,
        }}
      />
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
        <SegmentedControl<PlanCategory>
          value={category}
          onChange={(c) => {
            setCategory(c);
            setReordering(false);
          }}
          options={PLAN_CATEGORIES.map((c) => ({ value: c, label: t(`plans.segment.${c}`) }))}
        />
      </View>
      {body()}
      <PlanActionsSheet plan={actionsFor} onClose={() => setActionsFor(null)} />
    </View>
  );
}
