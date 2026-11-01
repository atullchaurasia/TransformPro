import * as DocumentPicker from 'expo-document-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, EmptyState, FormScreen, Icon, Input, PinKeypad } from '@/components';
import { inspectBackup, startRestore, type InspectResult } from '@/features/backup/backupActions';
import { ownerHasPin, RESTORE_WORD, verifyOwnerPin } from '@/features/backup/restoreAuth';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { formatDateTime } from '@/utils/format';
import { logger } from '@/utils/logger';

/**
 * Restore (§10.15): pick a .transformpro file (or a local backup) → validate → summary →
 * type RESTORE + owner PIN → safety backup → swap the data → reopen at the lock screen.
 * Reachable from onboarding too (no owner yet → no PIN).
 */
export default function RestoreScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { date_format, language } = useSettings();
  const params = useLocalSearchParams<{ uri?: string }>();
  const [result, setResult] = useState<InspectResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [word, setWord] = useState('');
  const [pin, setPin] = useState('');
  const [needPin, setNeedPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inspect = useCallback(
    async (uri: string) => {
      setBusy(true);
      setError(null);
      try {
        setResult(await inspectBackup(uri));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    void ownerHasPin().then(setNeedPin).catch(() => setNeedPin(true));
    if (params.uri) void inspect(params.uri);
  }, [params.uri, inspect]);

  const pick = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      const asset = r.canceled ? null : r.assets[0];
      if (asset) await inspect(asset.uri);
    } catch (e) {
      logger.error('Picking backup failed', e);
      toast.error(t('backup.restore.pickFailed'));
    }
  };

  const confirm = async () => {
    if (!result?.ok || word.trim().toUpperCase() !== RESTORE_WORD) return;
    setBusy(true);
    setError(null);
    try {
      if (needPin) {
        const v = await verifyOwnerPin(pin);
        if (!v.ok) {
          setPin('');
          setError(v.cooldownMs > 0 ? t('checkin.kiosk.cooldown', { seconds: Math.ceil(v.cooldownMs / 1000) }) : t('backup.restore.wrongPin'));
          return;
        }
      }
      // From here DatabaseGate takes over the screen.
      await startRestore(result.backup, result.manifest);
    } catch (e) {
      logger.error('Starting restore failed', e);
      setError(t('backup.restore.safetyFailed'));
    } finally {
      setBusy(false);
    }
  };

  const header = <Stack.Screen options={{ title: t('backup.restore.title'), headerLeft: () => <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={() => router.back()} /> }} />;

  if (!result) {
    return (
      <>
        {header}
        <EmptyState icon="cloud-upload-outline" title={t('backup.restore.pickTitle')} message={t('backup.restore.pickMessage')} actionLabel={busy ? t('common.loading') : t('backup.restore.pick')} onAction={busy ? undefined : () => void pick()} />
      </>
    );
  }
  if (!result.ok) {
    return (
      <>
        {header}
        <EmptyState icon="alert-circle-outline" title={t('backup.restore.invalidTitle')} message={t(`backup.restore.problem.${result.problem}`)} actionLabel={t('backup.restore.pickAnother')} onAction={() => void pick()} />
      </>
    );
  }

  const m = result.manifest;
  return (
    <>
      {header}
      <FormScreen>
        <Card>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Icon name="archive-outline" size={32} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="headline">{m.gymName || t('common.appName')}</AppText>
              <AppText variant="subhead" tone="secondary">
                {t('backup.restore.summary', { date: formatDateTime(m.createdAt, date_format, language), members: m.counts.members ?? 0, payments: m.counts.payments ?? 0, photos: m.photoCount })}
              </AppText>
            </View>
          </View>
        </Card>
        <AppText variant="subhead" tone="danger" weight="600">
          {t('backup.restore.warning')}
        </AppText>
        <AppText variant="footnote" tone="secondary">
          {t('backup.restore.safetyNote')}
        </AppText>
        <Input label={t('backup.restore.typeWord', { word: RESTORE_WORD })} value={word} onChangeText={setWord} autoCapitalize="characters" autoCorrect={false} />
        {needPin ? (
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <AppText variant="subhead">{t('backup.restore.ownerPin')}</AppText>
            <PinKeypad value={pin} onChange={setPin} error={!!error} disabled={busy} />
          </View>
        ) : null}
        {error ? (
          <AppText variant="footnote" tone="danger" align="center">
            {error}
          </AppText>
        ) : null}
        <Button
          label={t('backup.restore.confirm')}
          variant="destructive"
          disabled={word.trim().toUpperCase() !== RESTORE_WORD || (needPin && pin.length < 4)}
          loading={busy}
          onPress={() => void confirm()}
          fullWidth
        />
      </FormScreen>
    </>
  );
}
