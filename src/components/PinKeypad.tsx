import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

export type PinKeypadProps = {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  /** Shows a Face ID key in the bottom-left slot when provided. */
  onBiometric?: () => void;
  disabled?: boolean;
  /** Shake/red dots after a wrong PIN. */
  error?: boolean;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

function DigitKey({ digit, onPress, disabled }: { digit: string; onPress: (d: string) => void; disabled: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onPress(digit)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={digit}
      style={({ pressed }) => [styles.key, { backgroundColor: pressed ? colors.border : colors.surfaceMuted, opacity: disabled ? 0.4 : 1 }]}
    >
      <AppText style={styles.keyText}>{digit}</AppText>
    </Pressable>
  );
}

/** Large PIN keypad for the lock screen and onboarding (spec §8). Controlled component. */
export function PinKeypad({ value, onChange, maxLength = 6, onBiometric, disabled = false, error = false }: PinKeypadProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const press = (digit: string) => {
    if (!disabled && value.length < maxLength) onChange(value + digit);
  };

  return (
    <View style={styles.root}>
      <View style={styles.dots} accessibilityLabel={`${value.length} / ${maxLength}`}>
        {Array.from({ length: maxLength }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                borderColor: error ? colors.danger : colors.text,
                backgroundColor: i < value.length ? (error ? colors.danger : colors.text) : 'transparent',
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((k) => (
          <DigitKey key={k} digit={k} onPress={press} disabled={disabled} />
        ))}
        {onBiometric ? (
          <Pressable
            onPress={onBiometric}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.useBiometrics')}
            style={styles.key}
          >
            <Icon name="scan-outline" size={32} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={styles.key} />
        )}
        <DigitKey digit="0" onPress={press} disabled={disabled} />
        <Pressable
          onPress={() => onChange(value.slice(0, -1))}
          disabled={disabled || value.length === 0}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.deleteDigit')}
          style={styles.key}
        >
          <Icon name="backspace-outline" size={28} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const SIZE = 76;

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 32 },
  dots: { flexDirection: 'row', gap: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: SIZE * 3 + 24 * 2, gap: 24, justifyContent: 'center' },
  key: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 32, fontWeight: '500' },
});
