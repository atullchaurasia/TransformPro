import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import { accentPalette, minTapSize, useTheme } from '@/theme';

/** Badge colour for a plan (§5.2 `plans.color`). */
export function ColorPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="footnote" tone="secondary" weight="600">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {accentPalette.map((c) => {
          const selected = c.toUpperCase() === value.toUpperCase();
          return (
            <Pressable
              key={c}
              onPress={() => onChange(c)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t('plans.colorOption', { color: c })}
              style={{ width: minTapSize, height: minTapSize, borderRadius: minTapSize / 2, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}
            >
              {selected ? <Icon name="checkmark" size={22} color="#FFFFFF" /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
