import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceSheet, GroupedSection, ListRow, ScreenScroll } from '@/components';
import type { PlanCategory } from '@/db/models';
import { lockNow, switchUser } from '@/features/auth/lockActions';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { MORE_MENU, type MoreItem } from '@/features/navigation/moreMenu';
import { toast } from '@/store/feedbackStore';
import type { LanguageCode, ThemePreference } from '@/store/preferencesStore';
import { useCurrentStaff } from '@/store/sessionStore';
import { useSettings, useSettingsStore } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

const PLAN_SEGMENT_FOR: Partial<Record<MoreItem['key'], PlanCategory>> = {
  plans: 'membership',
  personalTraining: 'personal_training',
  services: 'service',
};

export default function MoreScreen() {
  const { t } = useTranslation();
  const { theme, language } = useSettings();
  const staff = useCurrentStaff();
  const [sheet, setSheet] = useState<'language' | 'theme' | null>(null);

  // Saved to settings (and the audit log); the preferences store follows automatically.
  const save = async (patch: { theme?: ThemePreference; language?: LanguageCode }) => {
    try {
      await useSettingsStore.getState().update(patch);
    } catch (e) {
      logger.error('Saving preference failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  const valueFor = (item: MoreItem) =>
    item.key === 'language'
      ? t(`language.${language}`)
      : item.key === 'theme'
        ? t(`theme.${theme}`)
        : item.key === 'switchUser'
          ? staff?.name
          : undefined;

  const onPress = (item: MoreItem) => {
    if (item.key === 'language' || item.key === 'theme') return setSheet(item.key);
    const planCategory = PLAN_SEGMENT_FOR[item.key];
    if (planCategory) return router.push({ pathname: '/more/plans', params: { category: planCategory } });
    if (item.key === 'trash') return router.push('/more/trash');
    if (item.key === 'backup') return router.push('/backup');
    if (item.key === 'exportData') return router.push('/export');
    if (item.key === 'importMembers') return router.push('/import');
    if (item.key === 'lockNow') return void lockNow();
    if (item.key === 'switchUser') return void switchUser();
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
        onSelect={(language) => save({ language })}
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
        onSelect={(theme) => save({ theme })}
      />
    </>
  );
}
