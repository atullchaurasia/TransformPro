import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PlaceholderNote, ScreenScroll } from '@/components';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { HeaderIconButton } from '@/features/navigation/HeaderIconButton';

// TODO(M06): members list, filters, sort, swipe actions, multi-select.
export default function MembersScreen() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            // TODO(M06): global search
            <HeaderIconButton icon="search" accessibilityLabel={t('a11y.search')} onPress={() => openComingSoon('M06', t('common.search'))} />
          ),
        }}
      />
      <ScreenScroll>
        <PlaceholderNote text={t('placeholders.members')} />
      </ScreenScroll>
    </>
  );
}
