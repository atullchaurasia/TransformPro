import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, ErrorState, GroupedSection, ListRow, ScreenScroll, SkeletonList } from '@/components';
import { insertDemoMembers } from '@/features/dev/devBulkMembers';
import { ALL_TABLES, foreignKeysEnforced, insertDevSample, schemaVersion, tableCounts } from '@/features/dev/devSampleData';
import { useDataVersion } from '@/store/dataVersionStore';
import { toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

/** DEV ONLY: proves the schema works on the device (M02 "done when"). */
export default function DevDbScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const dataVersion = useDataVersion();
  const [state, setState] = useState<{ version: number; counts: Record<string, number> } | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setState({ version: await schemaVersion(), counts: await tableCounts() });
    } catch (e) {
      logger.error(e);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  if (!__DEV__) return <Redirect href="/home" />;

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      logger.error(e);
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScroll onRefresh={load}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.xl }}>
        <Button
          label={t('devDb.insertSample')}
          icon="add-circle"
          loading={busy}
          fullWidth
          onPress={() => run(async () => {
            await insertDevSample();
            toast.success(t('devDb.inserted'));
          })}
        />
        <Button
          label={t('devDb.insertDemoMembers')}
          variant="secondary"
          icon="people"
          loading={busy}
          fullWidth
          onPress={() => run(async () => {
            const n = await insertDemoMembers(2000);
            toast.success(t('devDb.demoInserted', { count: n }));
          })}
        />
        <Button
          label={t('devDb.testForeignKeys')}
          variant="secondary"
          icon="shield-checkmark"
          fullWidth
          onPress={() => run(async () => {
            if (await foreignKeysEnforced()) toast.success(t('devDb.fkOn'));
            else toast.error(t('devDb.fkOff'));
          })}
        />
      </View>
      {failed ? (
        <ErrorState onRetry={load} />
      ) : !state ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          <GroupedSection>
            <ListRow title={t('devDb.schemaVersion')} value={String(state.version)} />
          </GroupedSection>
          <GroupedSection title={t('devDb.tables')}>
            {ALL_TABLES.map((table) => (
              <ListRow key={table} title={table} value={String(state.counts[table] ?? 0)} />
            ))}
          </GroupedSection>
        </>
      )}
    </ScreenScroll>
  );
}
