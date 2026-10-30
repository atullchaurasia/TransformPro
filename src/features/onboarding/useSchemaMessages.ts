import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { SchemaMessages } from './schemas';

export function useSchemaMessages(): SchemaMessages {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      required: t('validation.required'),
      email: t('validation.email'),
      gstin: t('validation.gstin'),
      phone: t('validation.phone'),
      number: t('validation.number'),
    }),
    [t],
  );
}
