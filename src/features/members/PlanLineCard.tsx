import { Pressable, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AmountInput, AppText, Card, DateField, Icon, Input, ListRow, SegmentedControl, Select } from '@/components';
import type { Staff } from '@/db/models';
import { formatPaise } from '@/domain/money';
import { defaultEndDate, type PlanLine, type SubscriptionDraft } from '@/domain/newMember';
import { usePlanLabels } from '@/features/plans/usePlanLabels';
import { useSettings } from '@/store/settingsStore';
import { minTapSize, useTheme } from '@/theme';

export type PlanLineCardProps = {
  line: PlanLine;
  draft: SubscriptionDraft | null;
  error: string | null;
  trainers: Staff[];
  onChange: (line: PlanLine) => void;
  /** Omit to hide the remove button (renew / edit a plan). */
  onRemove?: () => void;
};

/** One plan in Add member step 2: dates, price, admission, discount, trainer, line total (§10.2). */
export function PlanLineCard({ line, draft, error, trainers, onChange, onRemove }: PlanLineCardProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { currency_code, currency_symbol, date_format, tax_enabled, tax_inclusive, tax_percent } = useSettings();
  const { summary, category } = usePlanLabels();
  const set = (patch: Partial<PlanLine>) => onChange({ ...line, ...patch });
  const discountType = line.discount?.type ?? 'amount';
  const money = (p: number) => formatPaise(p, currency_code);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" tone="secondary">
            {category(line.plan.category)}
          </AppText>
          <AppText variant="headline">{line.plan.name}</AppText>
          <AppText variant="footnote" tone="secondary">
            {summary(line.plan)}
          </AppText>
        </View>
        {onRemove ? (
          <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={t('members.plan.remove', { name: line.plan.name })} style={{ width: minTapSize, height: minTapSize, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close-circle" size={24} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <DateField
              label={t('members.plan.start')}
              value={line.startDate}
              dateFormat={date_format}
              onChange={(v) => v && set({ startDate: v, endDate: defaultEndDate(line.plan, v) })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label={t('members.plan.end')} value={line.endDate} minimumDate={line.startDate} dateFormat={date_format} onChange={(v) => v && set({ endDate: v })} />
          </View>
        </View>
        {line.plan.category === 'personal_training' ? (
          <Select
            label={t('members.plan.trainer')}
            value={line.trainerId}
            onChange={(trainerId) => set({ trainerId })}
            options={trainers.map((s) => ({ value: s.id, label: s.name }))}
          />
        ) : null}
        <AmountInput label={t('members.plan.price')} value={line.basePricePaise} onChange={(v) => set({ basePricePaise: v ?? 0 })} currencySymbol={currency_symbol} />
        {line.plan.admissionFeePaise > 0 ? (
          <View style={{ marginHorizontal: -spacing.lg }}>
            <ListRow
              title={t('members.plan.admission', { amount: money(line.plan.admissionFeePaise) })}
              right={<Switch value={line.includeAdmission} onValueChange={(includeAdmission) => set({ includeAdmission })} accessibilityLabel={t('members.plan.admissionToggle')} />}
            />
          </View>
        ) : null}
        <SegmentedControl<'amount' | 'percent'>
          value={discountType}
          onChange={(type) => set({ discount: type === 'amount' ? { type, paise: 0 } : { type, percent: 0 } })}
          options={[
            { value: 'amount', label: t('members.plan.discountAmount', { symbol: currency_symbol }) },
            { value: 'percent', label: t('members.plan.discountPercent') },
          ]}
        />
        {discountType === 'amount' ? (
          <AmountInput
            label={t('members.plan.discount')}
            value={line.discount?.type === 'amount' ? line.discount.paise || null : null}
            onChange={(v) => set({ discount: v ? { type: 'amount', paise: v } : null })}
            currencySymbol={currency_symbol}
          />
        ) : (
          <Input
            label={t('members.plan.discount')}
            value={line.discount?.type === 'percent' && line.discount.percent ? String(line.discount.percent) : ''}
            onChangeText={(v) => {
              const n = Number(v.replace(',', '.'));
              set({ discount: v.trim() && Number.isFinite(n) ? { type: 'percent', percent: n } : null });
            }}
            keyboardType="decimal-pad"
            maxLength={5}
            right={<AppText tone="secondary">%</AppText>}
          />
        )}
        {line.discount ? (
          <Input label={t('members.plan.discountReason')} value={line.discountReason ?? ''} onChangeText={(discountReason) => set({ discountReason })} />
        ) : null}
        {error ? (
          <AppText variant="footnote" tone="danger">
            {error}
          </AppText>
        ) : null}
        {draft ? (
          <View style={{ gap: 2 }}>
            {draft.discountPaise > 0 ? <AppText variant="footnote" tone="secondary">{t('members.plan.discountLine', { amount: money(draft.discountPaise) })}</AppText> : null}
            {tax_enabled ? (
              <AppText variant="footnote" tone="secondary">
                {t(tax_inclusive ? 'members.plan.taxIncluded' : 'members.plan.taxAdded', { percent: tax_percent, amount: money(draft.taxPaise) })}
              </AppText>
            ) : null}
            <AppText variant="headline" align="right">
              {money(draft.totalPaise)}
            </AppText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
