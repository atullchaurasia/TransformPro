import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, Badge, Icon, StatusBadge, type IconName } from '@/components';
import { formatPaise } from '@/domain/money';
import { formatPhone } from '@/domain/phones';
import { useMemberLabels } from '@/features/members/useMemberLabels';
import { resolvePhotoUri } from '@/services/photos';
import { useSettings } from '@/store/settingsStore';
import { minTapSize, useTheme } from '@/theme';

import type { LoadedProfile } from './profileActions';

/** Large photo, name, code, status, days left, due and phone (§10.2 profile header). */
export function ProfileHeader({ profile }: { profile: LoadedProfile }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { currency_code } = useSettings();
  const labels = useMemberLabels();
  const { member, summary } = profile;
  const m = summary.status.membership;
  const timing = labels.timing({ status: m.status, daysLeft: m.daysLeft, daysSinceExpiry: m.daysSinceExpiry, expiryDate: m.coveredUntil });
  const due = summary.dues.totalDuePaise;

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg }}>
      <Avatar name={member.fullName} uri={resolvePhotoUri(member.photoUri)} size={96} />
      <AppText variant="title2" align="center">
        {member.fullName}
      </AppText>
      <AppText variant="subhead" tone="secondary">
        {member.memberCode} · {formatPhone(member.phone)}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
        <StatusBadge status={m.status} />
        {timing ? (
          <AppText variant="footnote" tone={m.status === 'expired' || m.status === 'grace' ? 'danger' : 'secondary'}>
            {timing}
          </AppText>
        ) : null}
        {due > 0 ? <Badge tone="danger" label={t('members.due', { amount: formatPaise(due, currency_code) })} /> : null}
      </View>
    </View>
  );
}

export type ProfileAction = 'call' | 'whatsapp' | 'sms' | 'checkin' | 'renew' | 'collect' | 'card' | 'more';

const ICONS: Record<ProfileAction, IconName> = {
  call: 'call',
  whatsapp: 'logo-whatsapp',
  sms: 'chatbubble-ellipses',
  checkin: 'enter-outline',
  renew: 'refresh',
  collect: 'cash-outline',
  card: 'card-outline',
  more: 'ellipsis-horizontal',
};

/** Call, WhatsApp, SMS, Check-in, Renew, Collect payment, Card, More (§10.2 action row). */
export function ProfileActionRow({ actions, onAction }: { actions: ProfileAction[]; onAction: (a: ProfileAction) => void }) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
      {actions.map((a) => (
        <Pressable
          key={a}
          onPress={() => onAction(a)}
          accessibilityRole="button"
          accessibilityLabel={t(`profile.action.${a}`)}
          style={({ pressed }) => ({
            width: 72,
            minHeight: minTapSize + 20,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            borderRadius: radius.md,
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          })}
        >
          <Icon name={ICONS[a]} size={22} color={colors.primary} />
          <AppText variant="caption" weight="600" numberOfLines={1}>
            {t(`profile.action.${a}`)}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}
