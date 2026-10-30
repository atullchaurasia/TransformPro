import type { BottomTabBarButtonProps } from 'expo-router/build/layouts/Tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components';
import { useTheme } from '@/theme';

/** The big centre Check-in button in the tab bar (spec §9). */
export function CheckinTabButton({ onPress, accessibilityState, accessibilityLabel, label }: BottomTabBarButtonProps & { label: string }) {
  const { colors } = useTheme();
  const selected = accessibilityState?.selected ?? false;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel ?? label}
      style={styles.wrap}
    >
      <View
        style={[
          styles.circle,
          { backgroundColor: colors.primary, borderColor: colors.tabBar, shadowOpacity: selected ? 0.35 : 0.2 },
        ]}
      >
        <Icon name="qr-code" size={28} color={colors.onPrimary} />
      </View>
      <AppText variant="caption" weight="600" tone={selected ? 'brand' : 'secondary'} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  circle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 4,
    marginTop: -26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B2C',
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  label: { marginTop: 2, fontSize: 10 },
});
