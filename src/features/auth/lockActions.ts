import { i18n } from '@/i18n';
import { toast } from '@/store/feedbackStore';
import { useSettingsStore } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

import { signOut } from './session';

async function run(switchUser: boolean) {
  if (!useSettingsStore.getState().settings.lock_enabled && !switchUser) {
    // Lock is off in Settings: there's no lock screen to go to.
    toast.info(i18n.t('lock.lockDisabled'));
    return;
  }
  try {
    await signOut({ switchUser });
  } catch (e) {
    logger.error('Sign out failed', e);
    toast.error(i18n.t('common.somethingWentWrong'));
  }
}

/** "Lock now" (More tab and Home header, §8). */
export const lockNow = () => run(false);
/** "Switch user" (More tab, §8) — the lock screen then shows every staff member. */
export const switchUser = () => run(true);
