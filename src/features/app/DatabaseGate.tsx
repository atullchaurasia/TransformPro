import { SQLiteProvider } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, ErrorState } from '@/components';
import { DB_NAME, initDatabase } from '@/db/client';
import { logRestore } from '@/features/backup/backupActions';
import { replaceDataFiles } from '@/services/backup';
import { toast } from '@/store/feedbackStore';
import { useKioskStore } from '@/store/kioskStore';
import { useRestoreStore } from '@/store/restoreStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

/** Inside the reopened provider: writes the restore audit entry and confirms (§10.15 step 6). */
function RestoreFinisher() {
  const { t } = useTranslation();
  const manifest = useRestoreStore((s) => s.justRestored);
  useEffect(() => {
    if (!manifest) return;
    useRestoreStore.getState().clearJustRestored();
    void logRestore(manifest)
      .catch((e: unknown) => logger.error('Restore audit failed', e))
      .finally(() => toast.success(t('backup.restore.done', { count: manifest.counts.members ?? 0 })));
  }, [manifest, t]);
  return null;
}

/**
 * Opens transformpro.db and runs migrations before rendering the app. If that fails the
 * user sees an error with Retry instead of a blank screen; their data is untouched because
 * migrations run in transactions and never start without a safety backup.
 *
 * During a restore (§10.15) the app and the provider are unmounted, the files are swapped,
 * and the provider is mounted again — which reopens the DB and runs any migrations.
 */
export function DatabaseGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const phase = useRestoreStore((s) => s.phase);
  const job = useRestoreStore((s) => s.job);
  const restoreError = useRestoreStore((s) => s.error);

  useEffect(() => {
    if (phase !== 'replacing' || !job) return;
    void (async () => {
      try {
        await replaceDataFiles(job.backup);
        // Whoever was signed in belongs to the old data: start again from the lock screen.
        useSessionStore.getState().lock({ switchUser: true });
        useKioskStore.getState().exit();
        useSettingsStore.setState({ hydrated: false });
        useRestoreStore.getState().done(job.manifest);
      } catch (e) {
        logger.error('Restore file swap failed', e);
        useRestoreStore.getState().fail(String(e));
      } finally {
        setAttempt((n) => n + 1);
      }
    })();
  }, [phase, job]);

  if (phase === 'replacing') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="headline" align="center">
          {t('backup.restore.restoring')}
        </AppText>
        <AppText variant="subhead" tone="secondary" align="center">
          {t('backup.restore.dontClose')}
        </AppText>
      </View>
    );
  }

  if (phase === 'failed' || error) {
    const newerSchema = !!error && /newer than this app/.test(error.message);
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ErrorState
          message={phase === 'failed' ? t('backup.restore.swapFailed') : newerSchema ? t('db.newerSchema') : t('db.openFailed')}
          onRetry={() => {
            if (restoreError !== null) logger.warn('Retrying after a failed restore', restoreError);
            useRestoreStore.getState().reset();
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
      <RestoreFinisher />
      {children}
    </SQLiteProvider>
  );
}
