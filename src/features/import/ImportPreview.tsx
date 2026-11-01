import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Select } from '@/components';
import { IMPORT_FIELDS, type ImportField } from '@/domain/csvImport';
import { useTheme } from '@/theme';

import type { ImportState } from './useImport';

const NONE = '__none__';
const REQUIRED: ImportField[] = ['fullName', 'phone'];

/** First 20 rows as a table (§10.2 "preview first 20 rows"). */
export function ImportPreview({ s }: { s: ImportState }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const cell = { width: 120, paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 1, borderColor: colors.separator } as const;
  return (
    <Card padded={false}>
      <AppText variant="footnote" tone="secondary" weight="600" style={{ padding: spacing.md }}>
        {t('import.preview', { count: Math.min(20, s.rowCount), total: s.rowCount }).toUpperCase()}
      </AppText>
      <ScrollView horizontal>
        <View>
          <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceMuted }}>
            {s.headers.map((h, i) => (
              <AppText key={`h${i}`} variant="caption" weight="700" numberOfLines={1} style={cell}>
                {h || `#${i + 1}`}
              </AppText>
            ))}
          </View>
          {s.preview.map((r, ri) => (
            <View key={`r${ri}`} style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.separator }}>
              {s.headers.map((_, ci) => (
                <AppText key={`c${ci}`} variant="caption" numberOfLines={1} style={cell}>
                  {r[ci] ?? ''}
                </AppText>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}

/** Which CSV column feeds which member field (§10.2 "map columns"); auto-guessed from headers. */
export function ImportMapping({ s }: { s: ImportState }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  if (!s.mapping) return null;
  const options = [{ value: NONE, label: t('import.notInFile') }, ...s.headers.map((h, i) => ({ value: String(i), label: h || `#${i + 1}` }))];
  return (
    <View style={{ gap: spacing.md }}>
      <AppText variant="footnote" tone="secondary" weight="600">
        {t('import.mapTitle').toUpperCase()}
      </AppText>
      {IMPORT_FIELDS.map((f) => (
        <Select
          key={f}
          label={t(`import.field.${f}`)}
          required={REQUIRED.includes(f)}
          value={s.mapping?.[f] == null ? NONE : String(s.mapping[f])}
          onChange={(v) => s.setField(f, v === NONE ? null : Number(v))}
          options={options}
        />
      ))}
    </View>
  );
}

/** Rows that will be skipped, with the reason per field (§10.2 "show errors per row"). */
export function ImportIssues({ s }: { s: ImportState }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  if (s.errors.length === 0) return null;
  return (
    <Card>
      <AppText variant="headline" tone="danger">
        {t('import.errorsTitle', { count: s.errors.length })}
      </AppText>
      <View style={{ gap: 4, marginTop: spacing.sm }}>
        {s.errors.slice(0, 50).map((r) => (
          <AppText key={r.row} variant="footnote">
            {t('import.rowLabel', { row: r.row })}: {r.errors.map((e) => `${t(`import.field.${e.field}`)} — ${t(`import.error.${e.error}`)}`).join('; ')}
          </AppText>
        ))}
        {s.errors.length > 50 ? (
          <AppText variant="footnote" tone="secondary">
            {t('import.moreErrors', { count: s.errors.length - 50 })}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
