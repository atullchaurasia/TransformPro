import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionSheet, type IconName } from '@/components';
import type { PlanAction } from '@/domain/lifecycle';
import type { SubscriptionRow } from '@/domain/memberProfile';
import { useTheme } from '@/theme';

const ICONS: Record<PlanAction, IconName> = {
  renew: 'refresh',
  freeze: 'snow-outline',
  unfreeze: 'sunny-outline',
  extend: 'calendar-outline',
  changePlan: 'swap-horizontal',
  edit: 'create-outline',
  cancel: 'close-circle-outline',
  delete: 'trash-outline',
};

export type SubscriptionActionsSheetProps = {
  row: SubscriptionRow | null;
  actionsFor: (row: SubscriptionRow) => PlanAction[];
  onClose: () => void;
  /** Runs after the sheet has fully closed, so the next sheet/dialog can be presented (iOS). */
  onSelect: (action: PlanAction, row: SubscriptionRow) => void;
};

/** Renew / Freeze / Unfreeze / Extend / Change plan / Edit / Cancel / Delete for one plan (§10.2). */
export function SubscriptionActionsSheet({ row, actionsFor, onClose, onSelect }: SubscriptionActionsSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Keep the last row on screen while the sheet animates away.
  const [shown, setShown] = useState<SubscriptionRow | null>(row);
  if (row && row !== shown) setShown(row);

  const color = (a: PlanAction) => (a === 'freeze' || a === 'unfreeze' ? colors.info : undefined);
  return (
    <ActionSheet<PlanAction>
      visible={row !== null}
      onClose={onClose}
      title={shown?.sub.planNameSnapshot}
      items={(shown ? actionsFor(shown) : []).map((a) => ({ key: a, label: t(`profile.planAction.${a}`), icon: ICONS[a], color: color(a), destructive: a === 'cancel' || a === 'delete' }))}
      onSelect={(a) => shown && onSelect(a, shown)}
    />
  );
}
