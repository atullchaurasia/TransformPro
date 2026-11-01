import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ActionSheet, AppText, Button, Card, ErrorState, GroupedSection, ListRow, ScreenScroll, SkeletonList } from '@/components';
import { formatBytes } from '@/domain/backup';
import { useCan } from '@/features/auth/permissions';
import { backupNow, loadBackupOverview, shareBackup } from '@/features/backup/backupActions';
import { BackupError, deleteLocalBackup, type LocalBackup } from '@/services/backup';
import { useDataVersion } from '@/store/dataVersionStore';
import { confirm, toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { formatDateTime } from '@/utils/format';
import { logger } from '@/utils/logger';

type Overview = Awaited<ReturnType<typeof loadBackupOverview>>;
type FileAction = 'share' | 'restore' | 'delete';

/** Backup & Restore (§10.15). */
export default function BackupScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { last_backup_at, date_format, language } = useSettings();
  const canCreate = useCan('backup.create');
  const canRestore = useCan('backup.restore');
  const dataVersion = useDataVersion();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  const [working, setWorking] = useState(false);
  const [active, setActive] = useState<LocalBackup | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setOverview(await loadBackupOverview());
    } catch (e) {
      logger.error('Loading backup overview failed', e);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const doBackup = async () => {
    setWorking(true);
    try {
      const created = await backupNow();
      toast.success(t('backup.created', { size: formatBytes(created.size) }));
      // Share sheet: Files (On My iPhone / USB drive), AirDrop, WhatsApp, Mail (§10.15 step 2).
      if ((await shareBackup(created.uri)) === 'unavailable') toast.error(t('receipt.shareUnavailable'));
      await load();
    } catch (e) {
      logger.error('Backup failed', e);
      toast.error(e instanceof BackupError && e.reason === 'storage' ? t('backup.storageFull') : t('backup.failed'));
    } finally {
      setWorking(false);
    }
  };

  const onFile = async (a: FileAction, b: LocalBackup) => {
    if (a === 'share') return void shareBackup(b.uri);
    if (a === 'restore') return router.push({ pathname: '/backup/restore', params: { uri: b.uri } });
    if (!(await confirm({ title: t('backup.deleteTitle'), message: b.name, destructive: true, confirmLabel: t('common.delete') }))) return;
    try {
      deleteLocalBackup(b.uri);
      await load();
    } catch (e) {
      logger.error('Deleting backup failed', e);
      toast.error(t('common.somethingWentWrong'));
    }
  };

  const header = <Stack.Screen options={{ title: t('backup.title'), headerLargeTitleEnabled: false }} />;
  if (!canCreate && !canRestore) return <>{header}<ErrorState message={t('auth.noPermission')} /></>;

  return (
    <>
      {header}
      <ScreenScroll onRefresh={() => void load()}>
        <View style={{ gap: spacing.lg }}>
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <Card>
              <AppText variant="footnote" tone="secondary" weight="600">
                {t('backup.last').toUpperCase()}
              </AppText>
              <AppText variant="title3">{last_backup_at ? formatDateTime(last_backup_at, date_format, language) : t('backup.never')}</AppText>
              {overview ? (
                <AppText variant="subhead" tone="secondary">
                  {t('backup.stats', { members: overview.counts.members ?? 0, payments: overview.counts.payments ?? 0, size: formatBytes(overview.size) })}
                </AppText>
              ) : null}
            </Card>
            {canCreate ? <Button label={t('backup.now')} icon="cloud-download-outline" onPress={() => void doBackup()} loading={working} fullWidth /> : null}
            {canRestore ? <Button label={t('backup.restoreFromFile')} icon="cloud-upload-outline" variant="secondary" onPress={() => router.push('/backup/restore')} fullWidth /> : null}
          </View>

          {failed ? <ErrorState onRetry={load} /> : !overview ? <View style={{ paddingHorizontal: spacing.lg }}><SkeletonList rows={3} /></View> : (
            <GroupedSection title={t('backup.local')} footer={t('backup.localFooter')}>
              {overview.backups.length === 0 ? (
                <ListRow title={t('backup.noLocal')} />
              ) : (
                overview.backups.map((b) => (
                  <ListRow
                    key={b.uri}
                    title={b.name.replace(/\.transformpro$/, '')}
                    subtitle={`${t(b.folder === 'backups' ? 'backup.manualCopy' : 'backup.autoCopy')} · ${formatBytes(b.size)}`}
                    icon={b.folder === 'backups' ? 'archive-outline' : 'time-outline'}
                    iconBackground={b.folder === 'backups' ? colors.success : colors.info}
                    onPress={() => {
                      setActive(b);
                      setOpen(true);
                    }}
                  />
                ))
              )}
            </GroupedSection>
          )}

          <GroupedSection title={t('backup.help.title')}>
            <AppText variant="subhead" style={{ padding: spacing.lg }}>
              {t('backup.help.body')}
            </AppText>
          </GroupedSection>
        </View>
      </ScreenScroll>
      <ActionSheet<FileAction>
        visible={open}
        onClose={() => setOpen(false)}
        title={active?.name}
        items={[
          { key: 'share', label: t('backup.share'), icon: 'share-outline' },
          ...(canRestore ? [{ key: 'restore' as const, label: t('backup.restoreThis'), icon: 'cloud-upload-outline' as const, color: colors.warning }] : []),
          { key: 'delete', label: t('common.delete'), icon: 'trash-outline', destructive: true },
        ]}
        onSelect={(a) => active && void onFile(a, active)}
      />
    </>
  );
}
