import { Pressable } from 'react-native';

import { Icon, type IconName } from '@/components';
import { minTapSize, useTheme } from '@/theme';

/** Icon-only header button with a 44pt tap target and a required a11y label (spec §12, §21). */
export function HeaderIconButton({ icon, onPress, accessibilityLabel }: { icon: IconName; onPress: () => void; accessibilityLabel: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={{ minWidth: minTapSize, minHeight: minTapSize, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} size={24} color={colors.primary} />
    </Pressable>
  );
}
