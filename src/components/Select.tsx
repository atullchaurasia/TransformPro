import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { minTapSize, useTheme } from '@/theme';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { FieldButton } from './FieldButton';
import { Icon } from './Icon';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  /** Optional colour dot, e.g. a plan's badge colour. */
  color?: string;
};

type OptionRowProps = { label: string; description?: string; color?: string; selected: boolean; onPress: () => void };

function OptionRow({ label, description, color, selected, onPress }: OptionRowProps) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.row,
        { paddingHorizontal: spacing.lg, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' },
      ]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <View style={styles.flex}>
        <AppText variant="body">{label}</AppText>
        {description ? (
          <AppText variant="footnote" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      {selected ? <Icon name="checkmark" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

export type ChoiceSheetProps<T extends string> = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: SelectOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
};

/** Single-choice list in a bottom sheet; closes on pick. Used by Select and settings-style rows. */
export function ChoiceSheet<T extends string>({ visible, onClose, title, options, value, onSelect }: ChoiceSheetProps<T>) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <FlatList
        data={options}
        keyExtractor={(o) => o.value}
        renderItem={({ item }) => (
          <OptionRow
            label={item.label}
            description={item.description}
            color={item.color}
            selected={item.value === value}
            onPress={() => {
              onSelect(item.value);
              onClose();
            }}
          />
        )}
      />
    </BottomSheet>
  );
}

export type SelectProps<T extends string> = {
  label?: string;
  required?: boolean;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
};

export function Select<T extends string>({ label, required, value, options, onChange, placeholder, error }: SelectProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <FieldButton
        label={label}
        required={required}
        display={current?.label ?? ''}
        placeholder={placeholder ?? t('fields.selectOption')}
        icon="chevron-down"
        error={error}
        onPress={() => setOpen(true)}
      />
      <ChoiceSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        options={options}
        value={value}
        onSelect={onChange}
      />
    </>
  );
}

export type MultiSelectProps<T extends string> = {
  label?: string;
  values: T[];
  options: SelectOption<T>[];
  onChange: (values: T[]) => void;
  placeholder?: string;
};

export function MultiSelect<T extends string>({ label, values, options, onChange, placeholder }: MultiSelectProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<T[]>(values);

  const display =
    values.length === 0
      ? ''
      : values.length <= 2
        ? options.filter((o) => values.includes(o.value)).map((o) => o.label).join(', ')
        : t('common.selected', { count: values.length });

  const toggle = (v: T) => setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));

  return (
    <>
      <FieldButton
        label={label}
        display={display}
        placeholder={placeholder ?? t('fields.selectOption')}
        icon="chevron-down"
        onPress={() => {
          setDraft(values);
          setOpen(true);
        }}
      />
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        headerRight={
          <Button
            label={t('common.done')}
            variant="ghost"
            size="sm"
            onPress={() => {
              onChange(draft);
              setOpen(false);
            }}
          />
        }
      >
        <FlatList
          data={options}
          keyExtractor={(o) => o.value}
          renderItem={({ item }) => (
            <OptionRow
              label={item.label}
              description={item.description}
              color={item.color}
              selected={draft.includes(item.value)}
              onPress={() => toggle(item.value)}
            />
          )}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: minTapSize + 8, gap: 12, paddingVertical: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  flex: { flex: 1 },
});
