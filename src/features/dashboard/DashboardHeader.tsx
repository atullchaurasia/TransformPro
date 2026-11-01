import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import { resolvePhotoUri } from '@/services/photos';
import { useCurrentStaff } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { formatDateMedium } from '@/utils/format';

import type { DashboardData } from './dashboardData';

function greetingKey(hour: number) {
  return hour < 12 ? 'dashboard.greeting.morning' : hour < 17 ? 'dashboard.greeting.afternoon' : 'dashboard.greeting.evening';
}

/** Gym logo + name, greeting with the staff member's name, today's date (§10.1). */
export function DashboardHeader() {
  const { t } = useTranslation();
  const { spacing, radius } = useTheme();
  const { gym_name, gym_logo_uri, language } = useSettings();
  const staff = useCurrentStaff();
  const logo = resolvePhotoUri(gym_logo_uri);
  const now = new Date();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg }}>
      {logo ? <Image source={{ uri: logo }} style={{ width: 52, height: 52, borderRadius: radius.md }} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
      <View style={{ flex: 1 }}>
        <AppText variant="footnote" tone="secondary" weight="600">
          {(gym_name || t('common.appName')).toUpperCase()}
        </AppText>
        <AppText variant="title2">{t(greetingKey(now.getHours()), { name: staff?.name.split(' ')[0] ?? '' })}</AppText>
        <AppText variant="subhead" tone="secondary">
          {formatDateMedium(now, language)}
        </AppText>
      </View>
    </View>
  );
}

/** Yellow "Last backup: X days ago — Back up now" (§10.1). */
export function BackupBanner({ backup }: { backup: DashboardData['backup'] }) {
  const { t } = useTranslation();
  const { spacing, radius, colors } = useTheme();
  if (!backup.due) return null;
  return (
    <Pressable
      onPress={() => router.push('/backup')}
      accessibilityRole="button"
      style={{ marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.warningSoft, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      <Icon name="warning" size={22} color={colors.warning} />
      <AppText variant="subhead" style={{ flex: 1 }}>
        {backup.daysAgo == null ? t('dashboard.backup.never') : t('dashboard.backup.daysAgo', { count: backup.daysAgo })}
      </AppText>
      <AppText variant="subhead" weight="700" tone="brand">
        {t('dashboard.backup.now')}
      </AppText>
    </Pressable>
  );
}
