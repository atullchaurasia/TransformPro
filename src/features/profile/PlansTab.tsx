import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState } from '@/components';
import { useTheme } from '@/theme';

import { CancelSheet } from './CancelSheet';
import { ExtendSheet } from './ExtendSheet';
import { FreezeSheet } from './FreezeSheet';
import type { LoadedProfile } from './profileActions';
import { SubscriptionActionsSheet } from './SubscriptionActionsSheet';
import { SubscriptionCard } from './SubscriptionCard';
import { usePlanActions } from './usePlanActions';

/** Timeline of every subscription with its lifecycle actions (§10.2 Plans tab). */
export function PlansTab({ profile }: { profile: LoadedProfile }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const pa = usePlanActions(profile);
  const { member, summary, staffNames, plans } = profile;
  const add = () => router.push({ pathname: '/member/[id]/renew', params: { id: member.id, mode: 'add' } });
  const sheetRow = (kind: 'freeze' | 'extend' | 'cancel') => (pa.sheet?.kind === kind ? pa.sheet.row : null);

  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      {pa.canAdd ? <Button label={t('profile.addPlan')} icon="add" variant="secondary" onPress={add} /> : null}
      {summary.rows.length === 0 ? (
        <EmptyState icon="albums-outline" title={t('profile.plans.emptyTitle')} message={t('profile.plans.emptyMessage')} />
      ) : (
        summary.rows.map((row) => {
          const actions = pa.actionsFor(row);
          return (
            <SubscriptionCard
              key={row.sub.id}
              row={row}
              trainerName={row.sub.trainerId ? (staffNames.get(row.sub.trainerId) ?? null) : null}
              onActions={actions.length > 0 ? () => pa.setMenu(row) : undefined}
            />
          );
        })
      )}

      <SubscriptionActionsSheet row={pa.menu} actionsFor={pa.actionsFor} onClose={() => pa.setMenu(null)} onSelect={pa.onSelect} />
      <FreezeSheet row={sheetRow('freeze')} plan={pa.sheet ? plans.get(pa.sheet.row.sub.planId) : undefined} member={member} canOverride={pa.canOverride} onClose={pa.closeSheet} />
      <ExtendSheet row={sheetRow('extend')} member={member} onClose={pa.closeSheet} />
      <CancelSheet row={sheetRow('cancel')} member={member} onClose={pa.closeSheet} />
    </View>
  );
}
