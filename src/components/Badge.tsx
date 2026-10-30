import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme, type StatusTone } from '@/theme';

import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeProps = { label: string; tone?: BadgeTone; color?: string };

export function Badge({ label, tone = 'neutral', color }: BadgeProps) {
  const { colors, radius } = useTheme();
  const map = {
    neutral: { fg: colors.textSecondary, bg: colors.surfaceMuted },
    brand: { fg: colors.primary, bg: colors.primarySoft },
    success: { fg: colors.success, bg: colors.successSoft },
    warning: { fg: colors.warning, bg: colors.warningSoft },
    danger: { fg: colors.danger, bg: colors.dangerSoft },
    info: { fg: colors.info, bg: colors.infoSoft },
  }[tone];
  // A custom colour (e.g. a plan's badge colour) is used as solid background.
  const fg = color ? '#FFFFFF' : map.fg;
  const bg = color ?? map.bg;
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: radius.pill }]}>
      <AppText variant="caption" weight="700" style={{ color: fg }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

/** Colour-coded membership status badge (spec §12). */
export function StatusBadge({ status }: { status: StatusTone }) {
  const { colors, radius } = useTheme();
  const { t } = useTranslation();
  const { fg, bg } = colors.status[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: radius.pill }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <AppText variant="caption" weight="700" style={{ color: fg }} numberOfLines={1}>
        {t(`status.${status}`)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
