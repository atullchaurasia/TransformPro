import { Pressable, StyleSheet, View } from 'react-native';

import { minTapSize, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type FieldButtonProps = {
  label?: string;
  required?: boolean;
  /** Displayed value; when empty the placeholder is shown. */
  display: string;
  placeholder: string;
  icon: IconName;
  error?: string;
  onPress: () => void;
};

/** Read-only field that opens a picker (dates, selects). Shared by DateField and Select. */
export function FieldButton({ label, required, display, placeholder, icon, error, onPress }: FieldButtonProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <AppText variant="footnote" tone="secondary" weight="600">
          {label}
          {required ? <AppText variant="footnote" tone="danger"> *</AppText> : null}
        </AppText>
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${display || placeholder}` : display || placeholder}
        style={({ pressed }) => [
          styles.field,
          {
            borderRadius: radius.md,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <AppText variant="body" tone={display ? 'default' : 'tertiary'} style={styles.value} numberOfLines={1}>
          {display || placeholder}
        </AppText>
        <Icon name={icon} size={18} color={colors.textTertiary} />
      </Pressable>
      {error ? (
        <AppText variant="footnote" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', minHeight: minTapSize + 4, borderWidth: 1, gap: 8 },
  value: { flex: 1 },
});
