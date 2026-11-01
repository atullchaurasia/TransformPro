import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components';
import type { CalendarDay } from '@/domain/attendance';
import { useTheme } from '@/theme';

/** Month grid with check-in days highlighted (§10.2 profile Attendance tab). */
export function AttendanceCalendar({ weeks, weekStart }: { weeks: CalendarDay[][]; weekStart: 'monday' | 'sunday' }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const names = weekStart === 'monday' ? (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const) : (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const);
  return (
    <View style={{ gap: spacing.xs }} accessibilityLabel={t('checkin.calendar.a11y')}>
      <View style={{ flexDirection: 'row' }}>
        {names.map((n) => (
          <AppText key={n} variant="caption" tone="secondary" align="center" style={{ flex: 1 }}>
            {t(`checkin.calendar.${n}`)}
          </AppText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]?.date} style={{ flexDirection: 'row' }}>
          {week.map((d) => (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}>
              <View
                accessibilityLabel={d.visited ? t('checkin.calendar.visited', { day: Number(d.date.slice(8)) }) : undefined}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: d.visited && d.inMonth ? colors.success : 'transparent',
                  borderWidth: d.isToday ? 2 : 0,
                  borderColor: colors.primary,
                }}
              >
                <AppText variant="subhead" weight={d.visited ? '700' : '400'} style={{ color: d.visited && d.inMonth ? '#FFFFFF' : d.inMonth ? colors.text : colors.textTertiary }}>
                  {Number(d.date.slice(8))}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
