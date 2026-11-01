import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, Card, EmptyState, ErrorState, Icon, SegmentedControl, SkeletonList, type IconName } from '@/components';
import type { DueMember, DuesSort } from '@/domain/collections';
import { formatPaise } from '@/domain/money';
import { firstName } from '@/domain/templates';
import { useCan } from '@/features/auth/permissions';
import { openMember } from '@/features/members/useMemberRowActions';
import { callPhone, openWhatsApp } from '@/services/messaging';
import { resolvePhotoUri } from '@/services/photos';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { brand, minTapSize, useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

import { useDues } from './useDues';

function RowButton({ icon, label, color, onPress }: { icon: IconName; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={{ width: minTapSize, height: minTapSize, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={22} color={color} />
    </Pressable>
  );
}

/** Every member with a balance, by amount or oldest; total at the top; Collect / WhatsApp / Call (§10.5). */
export function DuesView() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code, date_format, gym_name } = useSettings();
  const canCollect = useCan('payments.create');
  const canMessage = useCan('messages.send');
  const d = useDues();
  const money = (p: number) => formatPaise(p, currency_code);

  const remind = async (m: DueMember) => {
    // TODO(M14): use the "dues" template.
    const text = t('payments.dues.reminderText', { name: firstName(m.fullName), amount: money(m.duePaise), gym: gym_name });
    if ((await openWhatsApp(m.phone, text)) === 'unavailable') toast.error(t('members.cantWhatsApp'));
  };

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md }}>
      <Card>
        <AppText variant="footnote" tone="secondary" weight="600">
          {t('payments.dues.total').toUpperCase()}
        </AppText>
        <AppText variant="title1" tone="danger">
          {money(d.data?.totalPaise ?? 0)}
        </AppText>
        <AppText variant="footnote" tone="secondary">
          {t('members.count', { count: d.data?.members.length ?? 0 })}
        </AppText>
      </Card>
      <SegmentedControl<DuesSort>
        value={d.sort}
        onChange={d.setSort}
        options={[
          { value: 'amount', label: t('payments.dues.byAmount') },
          { value: 'oldest', label: t('payments.dues.byOldest') },
        ]}
      />
    </View>
  );

  if (d.failed) return <ErrorState onRetry={d.reload} />;
  if (!d.data) return <SkeletonList rows={6} />;
  return (
    <FlashList
      data={d.data.members}
      keyExtractor={(m) => m.id}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState icon="happy-outline" title={t('payments.dues.emptyTitle')} message={t('payments.dues.emptyMessage')} />}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 72 }} />}
      renderItem={({ item: m }) => (
        <Pressable
          onPress={() => openMember(m.id)}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingVertical: spacing.sm, backgroundColor: pressed ? colors.surfaceMuted : colors.surface })}
        >
          <Avatar name={m.fullName} uri={resolvePhotoUri(m.photoUri)} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="headline" numberOfLines={1}>
              {m.fullName}
            </AppText>
            <AppText variant="footnote" tone="secondary" numberOfLines={1}>
              {[m.memberCode, m.oldestSince ? t('payments.dues.since', { date: formatDate(m.oldestSince, date_format) }) : null].filter(Boolean).join(' · ')}
            </AppText>
            <AppText variant="subhead" tone="danger" weight="700">
              {money(m.duePaise)}
            </AppText>
          </View>
          {canCollect ? <RowButton icon="cash-outline" label={t('payments.dues.collect')} color={colors.success} onPress={() => router.push({ pathname: '/payment/new', params: { memberId: m.id } })} /> : null}
          {canMessage ? <RowButton icon="logo-whatsapp" label={t('payments.dues.remind')} color={brand.whatsapp} onPress={() => void remind(m)} /> : null}
          <RowButton icon="call-outline" label={t('members.actions.call')} color={colors.primary} onPress={() => void callPhone(m.phone).then((r) => r === 'unavailable' && toast.error(t('members.cantCall')))} />
        </Pressable>
      )}
    />
  );
}
