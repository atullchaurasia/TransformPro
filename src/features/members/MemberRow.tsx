import { memo, useRef } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, Icon, StatusBadge, type IconName } from '@/components';
import type { MemberSummary } from '@/domain/memberList';
import { formatPaise } from '@/domain/money';
import { resolvePhotoUri } from '@/services/photos';
import { brand, minTapSize, useTheme } from '@/theme';

import { useMemberLabels } from './useMemberLabels';

export type RowAction = 'call' | 'whatsapp' | 'checkin' | 'renew';

export type MemberRowProps = {
  member: MemberSummary;
  currency: string;
  selecting: boolean;
  selected: boolean;
  onPress: (m: MemberSummary) => void;
  onLongPress: (m: MemberSummary) => void;
  onAction: (action: RowAction, m: MemberSummary) => void;
  /** Swipe actions the logged-in staff member may use (hidden otherwise, §15). Keep the arrays stable. */
  leftActions: RowAction[];
  rightActions: RowAction[];
};

const SWIPE: Record<RowAction, { icon: IconName; color: (c: ReturnType<typeof useTheme>['colors']) => string }> = {
  call: { icon: 'call', color: (c) => c.success },
  whatsapp: { icon: 'logo-whatsapp', color: () => brand.whatsapp },
  checkin: { icon: 'enter-outline', color: (c) => c.info },
  renew: { icon: 'refresh', color: (c) => c.primary },
};

function SwipeButton({ icon, label, color, onPress }: { icon: IconName; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 76, backgroundColor: color, alignItems: 'center', justifyContent: 'center', gap: 4 }}
    >
      <Icon name={icon} size={22} color="#FFFFFF" />
      <AppText variant="caption" weight="600" style={{ color: '#FFFFFF' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** One member (§10.2): photo/initials, name, code, phone, plan, status, days left, due. */
function MemberRowBase({ member: m, currency, selecting, selected, onPress, onLongPress, onAction, leftActions, rightActions }: MemberRowProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const labels = useMemberLabels();
  const swipe = useRef<SwipeableMethods>(null);
  const act = (a: RowAction) => {
    swipe.current?.close();
    onAction(a, m);
  };
  const timing = labels.timing(m);

  const row = (
    <Pressable
      onPress={() => onPress(m)}
      onLongPress={() => onLongPress(m)}
      accessibilityRole="button"
      accessibilityState={selecting ? { selected } : undefined}
      accessibilityHint={selecting ? undefined : t('members.rowHint')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        minHeight: minTapSize + 20,
        backgroundColor: selected ? colors.primarySoft : pressed ? colors.surfaceMuted : colors.surface,
      })}
    >
      {selecting ? <Icon name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? colors.primary : colors.textTertiary} /> : null}
      <Avatar name={m.fullName} uri={resolvePhotoUri(m.photoUri)} size={48} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="headline" numberOfLines={1}>
          {m.fullName}
        </AppText>
        <AppText variant="footnote" tone="secondary" numberOfLines={1}>
          {m.memberCode} · {labels.phone(m.phone)}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <StatusBadge status={m.status} />
          {m.planName ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
              {m.planName}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        {timing ? (
          <AppText variant="footnote" tone={m.status === 'expired' || m.status === 'grace' ? 'danger' : 'secondary'}>
            {timing}
          </AppText>
        ) : null}
        {m.duePaise > 0 ? (
          <AppText variant="footnote" tone="danger" weight="600">
            {t('members.due', { amount: formatPaise(m.duePaise, currency) })}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );

  if (selecting) return row;
  const buttons = (list: RowAction[]) =>
    list.length === 0 ? null : (
      <View style={{ flexDirection: 'row' }}>
        {list.map((a) => (
          <SwipeButton key={a} icon={SWIPE[a].icon} label={t(`members.actions.${a}`)} color={SWIPE[a].color(colors)} onPress={() => act(a)} />
        ))}
      </View>
    );
  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      enabled={leftActions.length + rightActions.length > 0}
      renderLeftActions={leftActions.length > 0 ? () => buttons(leftActions) : undefined}
      renderRightActions={rightActions.length > 0 ? () => buttons(rightActions) : undefined}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

export const MemberRow = memo(MemberRowBase);
