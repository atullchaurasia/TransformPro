import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme, type ThemeColors, type TypographyVariant } from '@/theme';

export type TextTone =
  | 'default'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'onPrimary';

const toneToColor: Record<TextTone, keyof ThemeColors> = {
  default: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  inverse: 'textInverse',
  brand: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  onPrimary: 'onPrimary',
};

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
};

/** All text in the app goes through this, so typography and colours follow the theme. */
export function AppText({ variant = 'body', tone = 'default', weight, align, style, ...rest }: AppTextProps) {
  const { colors, typography } = useTheme();
  const color = colors[toneToColor[tone]] as string;
  return (
    <Text
      style={[typography[variant], { color }, weight ? { fontWeight: weight } : null, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
