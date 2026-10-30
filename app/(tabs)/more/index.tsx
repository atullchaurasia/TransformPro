import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceSheet, GroupedSection, ListRow, ScreenScroll } from '@/components';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { MORE_MENU, type MoreItem } from '@/features/navigation/moreMenu';
import { usePreferencesStore, type LanguageCode, type ThemePreference } from '@/store/preferencesStore';

export default function MoreScreen() {
  const { t } = useTranslation();
  const { theme, language, setTheme, setLanguage } = usePreferencesStore();
  const [sheet, setSheet] = useState<'language' | 'theme' | null>(null);

  const valueFor = (item: MoreItem) =>
    item.key === 'language' ? t(`language.${language}`) : item.key === 'theme' ? t(`theme.${theme}`) : undefined;

  const onPress = (item: MoreItem) => {
    if (item.key === 'language' || item.key === 'theme') return setSheet(item.key);
    // TODO(Mxx): each owning milestone (see moreMenu.ts) routes to its real screen here.
    if (item.milestone) openComingSoon(item.milestone, t(`more.items.${item.key}`));
  };

  return (
    <>
      <ScreenScroll>
        {MORE_MENU.map((group) => (
          <GroupedSection key={group.key} title={t(`more.groups.${group.key}`)}>
            {group.items.map((item) => (
              <ListRow
                key={item.key}
                title={t(`more.items.${item.key}`)}
                icon={item.icon}
                iconBackground={item.color}
                value={valueFor(item)}
                onPress={() => onPress(item)}
              />
            ))}
          </GroupedSection>
        ))}
        {__DEV__ ? (
          <GroupedSection title={t('more.groups.developer')}>
            <ListRow title={t('more.items.uiKit')} icon="color-palette" iconBackground="#DB2777" onPress={() => router.push('/dev/ui-kit')} />
            <ListRow title={t('more.items.devDb')} icon="server" iconBackground="#0891B2" onPress={() => router.push('/dev/db')} />
          </GroupedSection>
        ) : null}
      </ScreenScroll>

      <ChoiceSheet<LanguageCode>
        visible={sheet === 'language'}
        onClose={() => setSheet(null)}
        title={t('language.title')}
        value={language}
        options={[
          { value: 'en', label: t('language.en') },
          { value: 'hi', label: t('language.hi') },
        ]}
        onSelect={setLanguage}
      />
      <ChoiceSheet<ThemePreference>
        visible={sheet === 'theme'}
        onClose={() => setSheet(null)}
        title={t('theme.title')}
        value={theme}
        options={[
          { value: 'system', label: t('theme.system') },
          { value: 'light', label: t('theme.light') },
          { value: 'dark', label: t('theme.dark') },
        ]}
        onSelect={setTheme}
      />
    </>
  );
}
