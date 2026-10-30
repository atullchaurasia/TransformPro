import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '@/components';
import { CheckinTabButton } from '@/features/navigation/CheckinTabButton';
import { useTheme } from '@/theme';

function TabIcon({ name, activeName, focused, size }: { name: IconName; activeName: IconName; focused: boolean; size: number }) {
  const { colors } = useTheme();
  return <Icon name={focused ? activeName : name} color={focused ? colors.primary : colors.textSecondary} size={size} />;
}

const tabIcon =
  (name: IconName, activeName: IconName) =>
  ({ focused, size }: { focused: boolean; size: number }) => <TabIcon name={name} activeName={activeName} focused={focused} size={size} />;

/** Five bottom tabs (spec §9): Home, Members, big centre Check-in, Payments, More. */
export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.separator },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="members" options={{ title: t('tabs.members'), tabBarIcon: tabIcon('people-outline', 'people') }} />
      <Tabs.Screen
        name="checkin"
        options={{
          title: t('tabs.checkin'),
          tabBarButton: (props) => <CheckinTabButton {...props} label={t('tabs.checkin')} />,
        }}
      />
      <Tabs.Screen name="payments" options={{ title: t('tabs.payments'), tabBarIcon: tabIcon('wallet-outline', 'wallet') }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more'), tabBarIcon: tabIcon('menu-outline', 'menu') }} />
    </Tabs>
  );
}
