import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, DateField } from '@/components';
import { RANGE_PRESETS, type DayRange, type RangePreset } from '@/domain/collections';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

export type DateRangeBarProps = {
  preset: RangePreset;
  onPreset: (p: RangePreset) => void;
  custom: DayRange;
  onCustom: (r: DayRange) => void;
};

/** Today · Yesterday · This week · This month · Last month · Custom (§10.5). */
export function DateRangeBar({ preset, onPreset, custom, onCustom }: DateRangeBarProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { date_format } = useSettings();
  return (
    <View style={{ gap: spacing.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
        {RANGE_PRESETS.map((p) => (
          <Chip key={p} label={t(`payments.range.${p}`)} selected={preset === p} onPress={() => onPreset(p)} />
        ))}
      </ScrollView>
      {preset === 'custom' ? (
        <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg }}>
          <View style={{ flex: 1 }}>
            <DateField label={t('payments.range.from')} value={custom.from} onChange={(d) => d && onCustom({ ...custom, from: d })} dateFormat={date_format} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label={t('payments.range.to')} value={custom.to} onChange={(d) => d && onCustom({ ...custom, to: d })} dateFormat={date_format} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
