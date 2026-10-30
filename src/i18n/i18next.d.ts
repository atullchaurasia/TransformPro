import 'i18next';

import type en from './en.json';

// Makes t('some.key') type-checked against en.json, so a missing key fails `tsc`.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
