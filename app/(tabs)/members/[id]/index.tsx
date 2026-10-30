import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ActionSheet, AppText, Button, Card, Chip, ErrorState, PlaceholderNote, ScreenScroll, SkeletonList } from '@/components';
import { openMember } from '@/features/members/useMemberRowActions';
import { restoreMember } from '@/features/members/memberActions';
import { OverviewTab } from '@/features/profile/OverviewTab';
import { PlansTab } from '@/features/profile/PlansTab';
import { ProfileActionRow, ProfileHeader } from '@/features/profile/ProfileHeader';
import { openRenew, useProfileActions, type MoreAction } from '@/features/profile/useProfileActions';
import { useProfile } from '@/features/profile/useProfile';
import { useCan } from '@/features/auth/permissions';
import { toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';

type Tab = 'overview' | 'plans' | 'payments' | 'attendance' | 'measurements' | 'messages';
const TABS: Tab[] = ['overview', 'plans', 'payments', 'attendance', 'measurements', 'messages'];
/** Tabs owned by later milestones (roadmap Wire-up register). */
const LATER: Partial<Record<Tab, string>> = { payments: 'M08', attendance: 'M09', measurements: 'M17', messages: 'M14' };

/** Member profile (spec §10.2): header, actions, Overview / Plans / … tabs. */
export default function MemberProfileScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, failed, reload } = useProfile(id);
  const loaded = profile && profile !== 'missing' ? profile : null;
  const pa = useProfileActions(loaded);
  const canRenew = useCan('membership.renew');
  const canCreate = useCan('membership.create');
  const [tab, setTab] = useState<Tab>('overview');
  const [more, setMore] = useState(false);

  const header = <Stack.Screen options={{ title: loaded?.member.fullName ?? '', headerLargeTitleEnabled: false }} />;
  if (failed) return <>{header}<ErrorState onRetry={reload} /></>;
  if (profile === 'missing') return <>{header}<ErrorState message={t('members.notFound')} /></>;
  if (!loaded) return <>{header}<View style={{ padding: spacing.lg }}><SkeletonList rows={6} /></View></>;

  const { member } = loaded;
  const mayRenew = !member.deletedAt && (loaded.subscriptions.length > 0 ? canRenew : canCreate);
  // TODO(M08/M09/M14/M17): Payments, Attendance, Messages and Measurements tabs.
  const later = LATER[tab];

  return (
    <>
      {header}
      <ScreenScroll onRefresh={reload}>
        <View style={{ gap: spacing.lg }}>
          {member.deletedAt ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <Card>
                <View style={{ gap: spacing.sm }}>
                  <AppText variant="subhead">{t('members.inTrashBanner')}</AppText>
                  <Button
                    label={t('trash.restore')}
                    variant="secondary"
                    size="sm"
                    onPress={() =>
                      void restoreMember(member)
                        .then(() => toast.success(t('trash.restored', { name: member.fullName })))
                        .catch(() => toast.error(t('common.somethingWentWrong')))
                    }
                  />
                </View>
              </Card>
            </View>
          ) : null}
          <ProfileHeader profile={loaded} />
          <ProfileActionRow actions={pa.actions} onAction={(a) => void pa.onAction(a).then((r) => r === 'more' && setMore(true))} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
            {TABS.map((tb) => (
              <Chip key={tb} label={t(`profile.tab.${tb}`)} selected={tab === tb} onPress={() => setTab(tb)} />
            ))}
          </ScrollView>
          {tab === 'overview' ? (
            <OverviewTab profile={loaded} onRenew={mayRenew ? () => openRenew(loaded) : undefined} onOpenMember={openMember} />
          ) : tab === 'plans' ? (
            <PlansTab profile={loaded} />
          ) : later ? (
            <PlaceholderNote text={t('profile.tabLater', { milestone: later })} />
          ) : null}
        </View>
      </ScreenScroll>
      <ActionSheet<MoreAction> visible={more} title={member.fullName} items={pa.moreItems} onClose={() => setMore(false)} onSelect={(k) => void pa.onMore(k)} />
    </>
  );
}
