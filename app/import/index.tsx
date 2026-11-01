import { router, Stack } from 'expo-router';
import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, EmptyState, ErrorState, FormScreen, Icon, ListRow } from '@/components';
import { useCan } from '@/features/auth/permissions';
import { shareTemplate } from '@/features/import/importActions';
import { ImportIssues, ImportMapping, ImportPreview } from '@/features/import/ImportPreview';
import { useImport } from '@/features/import/useImport';
import { toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';

/** Import members from CSV (spec §10.2). */
export default function ImportScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const allowed = useCan('members.import');
  const s = useImport();

  if (!allowed) return <ErrorState message={t('auth.noPermission')} />;

  const header = <Stack.Screen options={{ title: t('import.title'), headerLargeTitleEnabled: false }} />;

  if (s.state === 'done') {
    return (
      <>
        {header}
        <EmptyState icon="checkmark-circle" title={t('import.doneTitle', { count: s.imported })} message={t('import.doneMessage', { duplicates: s.duplicates, errors: s.errors.length })} actionLabel={t('common.done')} onAction={() => router.back()} />
      </>
    );
  }

  const toggle = (
    <View style={{ marginHorizontal: -spacing.lg }}>
      <ListRow title={t('import.skipDuplicates')} subtitle={t('import.skipDuplicatesHint')} right={<Switch value={s.skipDuplicates} onValueChange={s.setSkipDuplicates} accessibilityLabel={t('import.skipDuplicates')} />} />
    </View>
  );

  if (!s.mapping) {
    return (
      <>
        {header}
        <FormScreen>
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Icon name="document-attach-outline" size={36} color={colors.primary} />
              <AppText variant="headline">{t('import.introTitle')}</AppText>
              <AppText variant="subhead" tone="secondary">
                {t('import.introBody')}
              </AppText>
            </View>
          </Card>
          <Button label={t('import.template')} icon="download-outline" variant="secondary" onPress={() => void shareTemplate().then((r) => r === 'unavailable' && toast.error(t('receipt.shareUnavailable')))} fullWidth />
          <Button label={t('import.pick')} icon="folder-open-outline" onPress={() => void s.pick()} loading={s.state === 'loading'} fullWidth />
          {s.state === 'unreadable' ? (
            <AppText variant="footnote" tone="danger">
              {t('import.unreadable')}
            </AppText>
          ) : null}
        </FormScreen>
      </>
    );
  }

  const run = () =>
    void s.run().catch(() => {
      toast.error(t('import.failed'));
    });

  return (
    <>
      {header}
      <FormScreen>
        <AppText variant="subhead" tone="secondary">
          {s.fileName}
        </AppText>
        <ImportPreview s={s} />
        <ImportMapping s={s} />
        <Card>{toggle}</Card>
        <Card>
          <AppText variant="headline">{t('import.readyTitle', { count: s.valid.length })}</AppText>
          <AppText variant="subhead" tone="secondary">
            {t('import.readySub', { duplicates: s.duplicates, errors: s.errors.length })}
          </AppText>
        </Card>
        <ImportIssues s={s} />
        <Button label={t('import.go', { count: s.valid.length })} onPress={run} disabled={s.valid.length === 0} loading={s.state === 'importing'} fullWidth />
        <Button label={t('import.pickAnother')} variant="ghost" onPress={s.reset} fullWidth />
      </FormScreen>
    </>
  );
}
