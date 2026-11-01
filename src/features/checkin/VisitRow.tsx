import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, Badge } from '@/components';
import type { AttendanceRow } from '@/db/repositories/attendance';
import { visitMinutes } from '@/domain/attendance';
import { resolvePhotoUri } from '@/services/photos';
import { useSettings } from '@/store/settingsStore';
import { minTapSize, useTheme } from '@/theme';
import { formatDate, formatTime } from '@/utils/format';

export type VisitRowProps = { row: AttendanceRow; onPress?: (r: AttendanceRow) => void; showDate?: boolean };

/** One visit: member, in → out time, duration, "Inside" while not checked out (§10.4). */
function VisitRowBase({ row, onPress, showDate = false }: VisitRowProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { language, date_format } = useSettings();
  const minutes = visitMinutes(row);
  const times = `${formatTime(row.checkInAt, language)} → ${row.checkOutAt ? formatTime(row.checkOutAt, language) : '…'}`;
  return (
    <Pressable
      onPress={onPress ? () => onPress(row) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        minHeight: minTapSize + 12,
        backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
      })}
    >
      <Avatar name={row.memberName} uri={resolvePhotoUri(row.memberPhotoUri)} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="headline" numberOfLines={1}>
          {row.memberName}
        </AppText>
        <AppText variant="footnote" tone="secondary" numberOfLines={1}>
          {[showDate ? formatDate(row.date, date_format) : null, row.memberCode, times].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      {row.checkOutAt ? (
        <AppText variant="footnote" tone="secondary">
          {minutes != null ? t('checkin.minutes', { count: minutes }) : ''}
        </AppText>
      ) : (
        <Badge tone="success" label={t('checkin.inside')} />
      )}
    </Pressable>
  );
}

export const VisitRow = memo(VisitRowBase);
