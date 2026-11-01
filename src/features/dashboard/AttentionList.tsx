import { useTranslation } from 'react-i18next';

import { GroupedSection, ListRow, type IconName } from '@/components';
import type { MemberBucket } from '@/domain/dashboard';
import { formatPaise } from '@/domain/money';
import { useCan, useMasked } from '@/features/auth/permissions';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { brand, useTheme } from '@/theme';
import { useSettings } from '@/store/settingsStore';

import type { DashboardData } from './dashboardData';
import { openBucket } from './openBucket';

type Item = { bucket: MemberBucket; icon: IconName; color: string };

/** Attention section (§10.1): every row opens its list; rows with nothing in them are hidden. */
export function AttentionList({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { currency_code, expiring_soon_days } = useSettings();
  const mask = useMasked();
  const canEnquiries = useCan('enquiries.view');

  const items: Item[] = [
    { bucket: 'expiringToday', icon: 'alarm-outline', color: colors.danger },
    { bucket: 'expiringSoon', icon: 'time-outline', color: colors.warning },
    { bucket: 'winBack', icon: 'heart-dislike-outline', color: colors.danger },
    { bucket: 'dues', icon: 'wallet-outline', color: colors.danger },
    { bucket: 'birthdays', icon: 'gift-outline', color: '#DB2777' },
    { bucket: 'anniversaries', icon: 'heart-outline', color: '#DB2777' },
    { bucket: 'absent', icon: 'person-remove-outline', color: colors.textSecondary },
    { bucket: 'frozenEnding', icon: 'snow-outline', color: colors.info },
  ];
  const rows = items.filter((i) => data.buckets[i.bucket].length > 0);
  const followUps = canEnquiries && data.agg.followUpsDue > 0;
  const subtitle = (b: MemberBucket) => (b === 'dues' ? t('dashboard.attention.duesTotal', { amount: mask(formatPaise(data.dueTotalPaise, currency_code)) }) : undefined);

  if (rows.length === 0 && !followUps) {
    return (
      <GroupedSection title={t('dashboard.attention.title')}>
        <ListRow title={t('dashboard.attention.allClear')} icon="checkmark-circle" iconBackground={brand.success} />
      </GroupedSection>
    );
  }
  return (
    <GroupedSection title={t('dashboard.attention.title')}>
      {rows.map((i) => (
        <ListRow
          key={i.bucket}
          title={t(`dashboard.bucket.${i.bucket}`, { days: expiring_soon_days })}
          subtitle={subtitle(i.bucket)}
          icon={i.icon}
          iconBackground={i.color}
          value={String(data.buckets[i.bucket].length)}
          onPress={() => openBucket(i.bucket)}
        />
      ))}
      {followUps ? (
        // TODO(M16): open today's / overdue enquiry follow-ups.
        <ListRow title={t('dashboard.attention.followUps')} icon="chatbubbles-outline" iconBackground="#9333EA" value={String(data.agg.followUpsDue)} onPress={() => openComingSoon('M16', t('dashboard.attention.followUps'))} />
      ) : null}
    </GroupedSection>
  );
}
