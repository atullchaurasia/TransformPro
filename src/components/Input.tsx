import type { ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { minTapSize, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  clearable?: boolean;
  ref?: Ref<TextInputInstance>;
};

/**
 * Labelled text field. For "Next moves between fields" (spec §12), pass
 * `returnKeyType="next"` and focus the next field's ref in `onSubmitEditing`.
 */
export function Input({ label, error, helper, required, left, right, clearable, style, value, onChangeText, ref, ...rest }: InputProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <AppText variant="footnote" tone="secondary" weight="600">
          {label}
          {required ? <AppText variant="footnote" tone="danger"> *</AppText> : null}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {left}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, typography.body, { color: colors.text }, style]}
          accessibilityLabel={label}
          {...rest}
        />
        {clearable && value ? (
          <Pressable
            onPress={() => onChangeText?.('')}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.clearText')}
            hitSlop={10}
          >
            <Icon name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? (
        <AppText variant="footnote" tone="danger">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="footnote" tone="tertiary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', minHeight: minTapSize + 4, borderWidth: 1, gap: 8 },
  input: { flex: 1, paddingVertical: 10 },
});
