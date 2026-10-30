import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { minTapSize, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Right-aligned text, e.g. "12 days left" or an amount. */
  value?: string;
  valueTone?: 'secondary' | 'danger' | 'success' | 'brand';
  /** Custom left element (e.g. an Avatar); takes priority over `icon`. */
  left?: ReactNode;
  icon?: IconName;
  iconBackground?: string;
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
};

export function ListRow({
  title,
  subtitle,
  value,
  valueTone = 'secondary',
  left,
  icon,
  iconBackground,
  right,
  onPress,
  showChevron,
  destructive,
  accessibilityLabel,
}: ListRowProps) {
  const { colors, spacing, radius } = useTheme();
  const chevron = showChevron ?? !!onPress;

  const content = (
    <>
      {left ??
        (icon ? (
          <View style={[styles.iconBox, { backgroundColor: iconBackground ?? colors.primary, borderRadius: radius.sm }]}>
            <Icon name={icon} size={18} color="#FFFFFF" />
          </View>
        ) : null)}
      <View style={styles.text}>
        <AppText variant="body" tone={destructive ? 'danger' : 'default'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="subhead" tone={valueTone} numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      {right}
      {chevron ? <Icon name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </>
  );

  const rowStyle = [styles.row, { paddingHorizontal: spacing.lg, gap: spacing.md }];
  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
      style={({ pressed }) => [rowStyle, pressed ? { backgroundColor: colors.surfaceMuted } : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: minTapSize + 8, paddingVertical: 8 },
  iconBox: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
