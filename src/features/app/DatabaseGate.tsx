import { SQLiteProvider } from 'expo-sqlite';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components';
import { DB_NAME, initDatabase } from '@/db/client';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

/**
 * Opens transformpro.db and runs migrations before rendering the app. If that fails the
 * user sees an error with Retry instead of a blank screen; their data is untouched because
 * migrations run in transactions and never start without a safety backup.
 */
export function DatabaseGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  if (error) {
    const newerSchema = /newer than this app/.test(error.message);
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ErrorState
          message={newerSchema ? t('db.newerSchema') : t('db.openFailed')}
          onRetry={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        />
      </View>
    );
  }

  return (
    <SQLiteProvider
      key={attempt}
      databaseName={DB_NAME}
      onInit={initDatabase}
      onError={(e) => {
        logger.error('Database init failed', e);
        setError(e);
      }}
    >
      {children}
    </SQLiteProvider>
  );
}
