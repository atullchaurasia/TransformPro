import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export type SectionHeaderProps = { title: string; actionLabel?: string; onAction?: () => void };

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.header, { paddingHorizontal: spacing.lg, marginBottom: spacing.xs }]}>
      <AppText variant="footnote" tone="secondary" weight="600" style={styles.headerText}>
        {title.toUpperCase()}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} variant="ghost" size="sm" onPress={onAction} /> : null}
    </View>
  );
}

export type GroupedSectionProps = { title?: string; footer?: string; children: ReactNode };

/** iOS inset-grouped list section with hairline separators between rows (spec §12). */
export function GroupedSection({ title, footer, children }: GroupedSectionProps) {
  const { colors, radius, spacing } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ marginBottom: spacing.xl }}>
      {title ? <SectionHeader title={title} /> : null}
      <View style={[styles.box, { backgroundColor: colors.surface, borderRadius: radius.lg, marginHorizontal: spacing.lg }]}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? <View style={[styles.separator, { backgroundColor: colors.separator, marginLeft: spacing.lg }]} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <AppText variant="footnote" tone="tertiary" style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xs }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  headerText: { letterSpacing: 0.4 },
  box: { overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth },
});
