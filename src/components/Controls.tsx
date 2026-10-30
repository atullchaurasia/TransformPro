import { Pressable, StyleSheet, View } from 'react-native';

import { minTapSize, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  count?: number;
};

/** Filter chip (members list filters etc.). */
export function Chip({ label, selected = false, onPress, icon, count }: ChipProps) {
  const { colors, radius } = useTheme();
  const fg = selected ? colors.onPrimary : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.primary : pressed ? colors.surfaceMuted : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <AppText variant="subhead" weight="600" style={{ color: fg }}>
        {label}
      </AppText>
      {count != null ? (
        <AppText variant="caption" weight="700" style={{ color: selected ? colors.onPrimary : colors.textSecondary }}>
          {count}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** iOS-style segmented control (e.g. Check-in modes, plan categories). */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted, borderRadius: radius.md }]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              { borderRadius: radius.md - 2, backgroundColor: selected ? colors.surfaceElevated : 'transparent' },
            ]}
          >
            <AppText variant="subhead" weight={selected ? '700' : '500'} numberOfLines={1} tone={selected ? 'default' : 'secondary'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export type FABProps = { icon?: IconName; onPress: () => void; accessibilityLabel: string; bottomOffset?: number };

/** Floating "+" quick-action button (spec §9). */
export function FAB({ icon = 'add', onPress, accessibilityLabel, bottomOffset = 24 }: FABProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        { bottom: bottomOffset, backgroundColor: pressed ? colors.primaryPressed : colors.primary },
      ]}
    >
      <Icon name={icon} size={30} color={colors.onPrimary} />
    </Pressable>
  );
}

export type ProgressBarProps = { progress: number; tone?: 'brand' | 'success' | 'warning' | 'danger'; height?: number };

/** Days-left bar, send-queue progress etc. `progress` is clamped to 0..1. */
export function ProgressBar({ progress, tone = 'brand', height = 8 }: ProgressBarProps) {
  const { colors } = useTheme();
  const fill = { brand: colors.primary, success: colors.success, warning: colors.warning, danger: colors.danger }[tone];
  const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View
      style={{ height, borderRadius: height / 2, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: fill }} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 34, borderWidth: 1 },
  segmented: { flexDirection: 'row', padding: 2 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 34, paddingHorizontal: 8 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    minWidth: minTapSize,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
