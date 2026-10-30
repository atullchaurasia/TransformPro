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
function MemberRowBase({ member: m, currency, selecting, selected, onPress, onLongPress, onAction }: MemberRowProps) {
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
  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => (
        <View style={{ flexDirection: 'row' }}>
          <SwipeButton icon="call" label={t('members.actions.call')} color={colors.success} onPress={() => act('call')} />
          <SwipeButton icon="logo-whatsapp" label={t('members.actions.whatsapp')} color={brand.whatsapp} onPress={() => act('whatsapp')} />
        </View>
      )}
      renderRightActions={() => (
        <View style={{ flexDirection: 'row' }}>
          <SwipeButton icon="enter-outline" label={t('members.actions.checkin')} color={colors.info} onPress={() => act('checkin')} />
          <SwipeButton icon="refresh" label={t('members.actions.renew')} color={colors.primary} onPress={() => act('renew')} />
        </View>
      )}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

export const MemberRow = memo(MemberRowBase);
