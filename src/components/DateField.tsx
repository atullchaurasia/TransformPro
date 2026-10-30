import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';
import { formatDate, toDate, toISODate, type DateFormatSetting } from '@/utils/format';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { FieldButton } from './FieldButton';

export type DateFieldProps = {
  label?: string;
  required?: boolean;
  /** Stored date `YYYY-MM-DD`, or null. */
  value: string | null;
  onChange: (value: string | null) => void;
  minimumDate?: string;
  maximumDate?: string;
  /** Allow clearing back to null (optional dates like DOB). */
  clearable?: boolean;
  dateFormat?: DateFormatSetting;
  error?: string;
};

/** Native iOS calendar picker in a bottom sheet; reads/writes `YYYY-MM-DD` strings. */
export function DateField({
  label,
  required,
  value,
  onChange,
  minimumDate,
  maximumDate,
  clearable = false,
  dateFormat = 'DD/MM/YYYY',
  error,
}: DateFieldProps) {
  const { t, i18n } = useTranslation();
  const { colors, spacing, scheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(new Date());

  const openPicker = () => {
    setDraft(toDate(value) ?? new Date());
    setOpen(true);
  };

  return (
    <>
      <FieldButton
        label={label}
        required={required}
        display={formatDate(value, dateFormat)}
        placeholder={t('fields.selectDate')}
        icon="calendar-outline"
        error={error}
        onPress={openPicker}
      />
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? t('fields.selectDate')}
        headerRight={
          <Button
            label={t('common.done')}
            variant="ghost"
            size="sm"
            onPress={() => {
              onChange(toISODate(draft));
              setOpen(false);
            }}
          />
        }
      >
        <View style={{ paddingHorizontal: spacing.sm }}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            locale={i18n.language === 'hi' ? 'hi-IN' : 'en-IN'}
            themeVariant={scheme}
            accentColor={colors.primary}
            minimumDate={toDate(minimumDate) ?? undefined}
            maximumDate={toDate(maximumDate) ?? undefined}
            onValueChange={(_event, date) => setDraft(date)}
          />
        </View>
        <View style={[styles.actions, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
          <Button label={t('common.today')} variant="secondary" size="sm" onPress={() => setDraft(new Date())} />
          {clearable && value ? (
            <Button
              label={t('common.clear')}
              variant="ghost"
              size="sm"
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
            />
          ) : null}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
});
