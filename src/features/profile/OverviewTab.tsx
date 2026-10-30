import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, GroupedSection, ListRow, ProgressBar, StatusBadge } from '@/components';
import { formatPaise } from '@/domain/money';
import { useMasked } from '@/features/auth/permissions';
import { useMemberLabels } from '@/features/members/useMemberLabels';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import { MemberDetails } from './MemberDetails';
import type { LoadedProfile } from './profileActions';

export type OverviewTabProps = {
  profile: LoadedProfile;
  onRenew?: () => void;
  onOpenMember: (id: string) => void;
};

/** Current plans, money, visits, referrals and notes (§10.2 Overview). */
export function OverviewTab({ profile, onRenew, onOpenMember }: OverviewTabProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { currency_code } = useSettings();
  const mask = useMasked();
  const labels = useMemberLabels();
  const { member, summary, staffNames } = profile;
  const money = (p: number) => formatPaise(p, currency_code);
  const { membership: ms, personalTraining: pt } = summary.status;
  const msRow = summary.rows.find((r) => r.sub.id === ms.subscription?.id);
  const ptRow = summary.rows.find((r) => r.sub.id === pt.subscription?.id);
  const showPt = ptRow && pt.status !== 'expired' && pt.status !== 'noPlan';
  const trainerName = summary.status.trainerId ? (staffNames.get(summary.status.trainerId) ?? null) : null;
  const tone = ms.status === 'expiring' ? 'warning' : ms.status === 'expired' || ms.status === 'grace' ? 'danger' : 'success';

  return (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl, gap: spacing.md }}>
        <Card>
          <View style={{ gap: spacing.sm }}>
            <AppText variant="footnote" tone="secondary" weight="600">
              {t('profile.overview.membership').toUpperCase()}
            </AppText>
            {msRow ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                  <AppText variant="headline" style={{ flex: 1 }} numberOfLines={1}>
                    {msRow.sub.planNameSnapshot}
                  </AppText>
                  <StatusBadge status={ms.status} />
                </View>
                <AppText variant="subhead" tone="secondary">
                  {t('profile.dates', { start: labels.date(msRow.sub.startDate), end: labels.date(msRow.sub.endDate) })}
                </AppText>
                <ProgressBar progress={msRow.progress} tone={tone} />
                <AppText variant="footnote" tone="secondary">
                  {labels.timing({ status: ms.status, daysLeft: ms.daysLeft, daysSinceExpiry: ms.daysSinceExpiry, expiryDate: ms.coveredUntil })}
                  {ms.coveredUntil && ms.coveredUntil !== msRow.sub.endDate ? ` · ${t('profile.coveredUntil', { date: labels.date(ms.coveredUntil) })}` : ''}
                </AppText>
              </>
            ) : (
              <AppText variant="subhead" tone="secondary">
                {t('profile.overview.noMembership')}
              </AppText>
            )}
            {onRenew && (ms.status === 'expired' || ms.status === 'grace' || ms.status === 'expiring' || ms.status === 'noPlan') ? (
              <Button label={ms.status === 'noPlan' ? t('profile.addPlan') : t('members.actions.renew')} icon="refresh" size="sm" onPress={onRenew} />
            ) : null}
          </View>
        </Card>
        {showPt ? (
          <Card>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="footnote" tone="secondary" weight="600">
                {t('profile.overview.pt').toUpperCase()}
              </AppText>
              <AppText variant="headline">{ptRow.sub.planNameSnapshot}</AppText>
              <AppText variant="subhead" tone="secondary">
                {[trainerName ? t('profile.overview.trainer', { name: trainerName }) : null, pt.sessionsLeft != null ? t('profile.sessionsLeft', { count: pt.sessionsLeft }) : labels.date(ptRow.sub.endDate)]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
          </Card>
        ) : null}
      </View>

      {summary.currentServices.length > 0 ? (
        <GroupedSection title={t('profile.overview.services')}>
          {summary.currentServices.map((r) => (
            <ListRow key={r.sub.id} title={r.sub.planNameSnapshot} value={t('profile.until', { date: labels.date(r.sub.endDate) })} />
          ))}
        </GroupedSection>
      ) : null}

      <GroupedSection title={t('profile.overview.summary')}>
        <ListRow title={t('profile.overview.lifetimePaid')} value={mask(money(summary.lifetimePaidPaise))} />
        <ListRow title={t('profile.overview.totalDue')} value={money(summary.dues.totalDuePaise)} valueTone={summary.dues.totalDuePaise > 0 ? 'danger' : 'secondary'} />
        {summary.dues.advancePaise > 0 ? <ListRow title={t('profile.overview.advance')} value={money(summary.dues.advancePaise)} valueTone="success" /> : null}
        <ListRow title={t('profile.overview.lastVisit')} value={profile.lastVisit ? labels.date(profile.lastVisit) : t('profile.overview.never')} />
        <ListRow title={t('profile.overview.visitsThisMonth')} value={String(profile.visitsThisMonth)} />
        <ListRow title={t('profile.overview.memberSince')} value={labels.date(member.joiningDate)} />
        {trainerName && !showPt ? <ListRow title={t('members.form.trainer')} value={trainerName} /> : null}
      </GroupedSection>

      {profile.referredBy || profile.referrals.length > 0 ? (
        <GroupedSection title={t('profile.overview.referrals')}>
          {profile.referredBy ? (
            <ListRow title={t('members.form.referredBy')} value={profile.referredBy.fullName} onPress={() => onOpenMember(profile.referredBy!.id)} />
          ) : null}
          {profile.referrals.map((r) => (
            <ListRow key={r.id} title={r.fullName} subtitle={t('profile.overview.referredByThem')} value={r.memberCode} onPress={() => onOpenMember(r.id)} />
          ))}
        </GroupedSection>
      ) : null}

      {member.notes ? (
        <GroupedSection title={t('members.form.notes')}>
          <AppText variant="body" style={{ padding: spacing.lg }}>
            {member.notes}
          </AppText>
        </GroupedSection>
      ) : null}

      <MemberDetails member={member} today={profile.today} />
    </View>
  );
}
