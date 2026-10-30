import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { LifecycleMessages } from './lifecycleSchemas';

export function useLifecycleMessages(): LifecycleMessages {
  const { t } = useTranslation();
  return useMemo(
    () => ({ required: t('validation.required'), wholeNumber: t('validation.wholeNumber'), laterDate: t('profile.extend.laterDate'), amount: t('validation.amount') }),
    [t],
  );
}
