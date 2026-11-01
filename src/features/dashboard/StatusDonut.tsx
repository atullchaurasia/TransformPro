import { Pressable, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components';
import type { MemberBucket } from '@/domain/dashboard';
import { minTapSize, useTheme, type StatusTone } from '@/theme';

import type { DashboardData } from './dashboardData';
import { openBucket } from './openBucket';

// Slice order alternates hue families so neighbours stay apart for colour-blind readers
// (validated with the dataviz palette script); the legend carries names + counts, so colour
// is never the only cue.
const SLICES: { bucket: MemberBucket; tone: StatusTone; key: 'active' | 'frozen' | 'expired' | 'upcoming' | 'noPlan' }[] = [
  { bucket: 'statusActive', tone: 'active', key: 'active' },
  { bucket: 'statusFrozen', tone: 'frozen', key: 'frozen' },
  { bucket: 'statusExpired', tone: 'expired', key: 'expired' },
  { bucket: 'statusUpcoming', tone: 'upcoming', key: 'upcoming' },
  { bucket: 'statusNoPlan', tone: 'noPlan', key: 'noPlan' },
];

/** Membership stats (§10.1): total, active, expired, frozen, upcoming, no plan. */
export function StatusDonut({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const total = data.buckets.all.length;
  const slices = SLICES.map((s) => ({ ...s, count: data.buckets[s.bucket].length, color: colors.status[s.tone].fg }));
  const pie = slices.filter((s) => s.count > 0).map((s) => ({ value: s.count, color: s.color }));

  return (
    <Card>
      <AppText variant="footnote" tone="secondary" weight="600">
        {t('dashboard.stats.title').toUpperCase()}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm }}>
        <View accessible accessibilityLabel={slices.map((s) => `${t(`members.status.${s.key}`)} ${s.count}`).join(', ')}>
          {total > 0 ? (
            <PieChart
              data={pie}
              donut
              radius={64}
              innerRadius={44}
              innerCircleColor={colors.surface}
              // 2 px surface gaps between slices.
              strokeWidth={2}
              strokeColor={colors.surface}
              centerLabelComponent={() => (
                <View style={{ alignItems: 'center' }}>
                  <AppText variant="title3">{total}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {t('dashboard.stats.total')}
                  </AppText>
                </View>
              )}
            />
          ) : (
            <View style={{ width: 128, height: 128, borderRadius: 64, borderWidth: 20, borderColor: colors.surfaceMuted }} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          {slices.map((s) => (
            <Pressable
              key={s.bucket}
              onPress={() => openBucket(s.bucket)}
              accessibilityRole="button"
              accessibilityLabel={`${t(`members.status.${s.key}`)}: ${s.count}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTapSize - 8 }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
              <AppText variant="subhead" style={{ flex: 1 }}>
                {t(`members.status.${s.key}`)}
              </AppText>
              <AppText variant="subhead" weight="600">
                {s.count}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </Card>
  );
}
