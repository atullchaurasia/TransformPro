import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Chip, ErrorState, FormScreen, SegmentedControl } from '@/components';
import { rangeFor, type DayRange, type RangePreset } from '@/domain/collections';
import { todayISO } from '@/domain/dates';
import { DATASETS, type Dataset } from '@/domain/exportData';
import { useCan } from '@/features/auth/permissions';
import { useExport } from '@/features/export/useExport';
import { DateRangeBar } from '@/features/payments/DateRangeBar';
import type { ExportFileFormat } from '@/services/export';
import { useExportSelection } from '@/store/exportSelectionStore';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

const isDataset = (v: unknown): v is Dataset => typeof v === 'string' && (DATASETS as readonly string[]).includes(v);

/** Export data (§10.16): datasets as XLSX / CSV for any date range, or everything in one workbook. */
export default function ExportScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { week_start } = useSettings();
  const params = useLocalSearchParams<{ dataset?: string; from?: string; to?: string }>();
  const allowed = useCan('members.export');
  const run = useExport();
  const selection = useExportSelection((s) => s.memberIds);
  const clearSelection = useExportSelection((s) => s.set);
  const [chosen, setChosen] = useState<Dataset[]>(isDataset(params.dataset) ? [params.dataset] : ['members']);
  const [allTime, setAllTime] = useState(!params.from);
  const [preset, setPreset] = useState<RangePreset>(params.from ? 'custom' : 'thisMonth');
  const [custom, setCustom] = useState<DayRange>({ from: params.from ?? todayISO(), to: params.to ?? todayISO() });
  const [format, setFormat] = useState<ExportFileFormat>('xlsx');
  const [busy, setBusy] = useState(false);

  // The member selection only applies to the export it was made for.
  useEffect(() => () => clearSelection(null), [clearSelection]);

  if (!allowed) return <ErrorState message={t('auth.noPermission')} />;

  const everything = chosen.length === DATASETS.length;
  const csvAllowed = chosen.length === 1;
  const effectiveFormat: ExportFileFormat = csvAllowed ? format : 'xlsx';
  const toggle = (d: Dataset) => setChosen((c) => (c.includes(d) ? (c.length > 1 ? c.filter((x) => x !== d) : c) : DATASETS.filter((x) => x === d || c.includes(x))));

  const go = async () => {
    setBusy(true);
    try {
      await run({ datasets: chosen, range: allTime ? null : rangeFor(preset, todayISO(), week_start, custom), format: effectiveFormat, memberIds: selection ?? undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('export.title'), headerLargeTitleEnabled: false }} />
      <FormScreen contentStyle={{ paddingHorizontal: 0 }}>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <AppText variant="footnote" tone="secondary" weight="600">
            {t('export.what').toUpperCase()}
          </AppText>
          {selection ? (
            <AppText variant="subhead" tone="brand">
              {t('export.selectedMembers', { count: selection.length })}
            </AppText>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {DATASETS.map((d) => (
            <Chip key={d} label={t(`export.dataset.${d}`)} selected={chosen.includes(d)} onPress={() => toggle(d)} />
          ))}
          <Chip label={t('export.everything')} icon="albums-outline" selected={everything} onPress={() => setChosen([...DATASETS])} />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <AppText variant="footnote" tone="secondary" weight="600">
            {t('export.when').toUpperCase()}
          </AppText>
          <SegmentedControl<'all' | 'range'> value={allTime ? 'all' : 'range'} onChange={(v) => setAllTime(v === 'all')} options={[{ value: 'all', label: t('export.allTime') }, { value: 'range', label: t('export.dateRange') }]} />
        </View>
        {!allTime ? <DateRangeBar preset={preset} onPreset={setPreset} custom={custom} onCustom={setCustom} /> : null}

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <AppText variant="footnote" tone="secondary" weight="600">
            {t('export.format').toUpperCase()}
          </AppText>
          <SegmentedControl<ExportFileFormat> value={effectiveFormat} onChange={setFormat} options={[{ value: 'xlsx', label: t('export.xlsx') }, ...(csvAllowed ? [{ value: 'csv' as const, label: t('export.csv') }] : [])]} />
          {!csvAllowed ? (
            <AppText variant="footnote" tone="secondary">
              {t('export.csvOneOnly')}
            </AppText>
          ) : null}
          <Button label={t('export.go')} icon="share-outline" onPress={() => void go()} loading={busy} fullWidth />
        </View>
      </FormScreen>
    </>
  );
}
