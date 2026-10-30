import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AmountInput,
  AppText,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  DateField,
  EmptyState,
  ErrorState,
  GroupedSection,
  Input,
  ListRow,
  MultiSelect,
  PhoneInput,
  PinKeypad,
  ProgressBar,
  ScreenScroll,
  SectionHeader,
  SegmentedControl,
  Select,
  SkeletonList,
  StatusBadge,
} from '@/components';
import { confirm, toast } from '@/store/feedbackStore';
import { usePreferencesStore, type ThemePreference } from '@/store/preferencesStore';
import { useTheme, type StatusTone } from '@/theme';

const STATUSES: StatusTone[] = ['active', 'expiring', 'grace', 'expired', 'frozen', 'upcoming', 'noPlan'];

function Block({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <SectionHeader title={title} />
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>{children}</View>
    </View>
  );
}

/** Dev-only gallery of every UI kit component, for checking light/dark mode and EN/HI. */
export default function UiKitScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { theme, setTheme, language, setLanguage } = usePreferencesStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number | null>(200000);
  const [date, setDate] = useState<string | null>(null);
  const [plan, setPlan] = useState<'monthly' | 'quarterly' | 'yearly' | null>(null);
  const [plans, setPlans] = useState<string[]>([]);
  const [segment, setSegment] = useState<'all' | 'active' | 'expired'>('all');
  const [chip, setChip] = useState(true);
  const [pin, setPin] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!__DEV__) return <Redirect href="/home" />;

  const planOptions = [
    { value: 'monthly' as const, label: t('uiKit.planMonthly'), color: '#FF6B2C' },
    { value: 'quarterly' as const, label: t('uiKit.planQuarterly'), color: '#2563EB' },
    { value: 'yearly' as const, label: t('uiKit.planYearly'), color: '#16A34A' },
  ];

  return (
    <ScreenScroll>
      <Block title={`${t('theme.title')} · ${t('language.title')}`}>
        <SegmentedControl<ThemePreference>
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: t('theme.system') },
            { value: 'light', label: t('theme.light') },
            { value: 'dark', label: t('theme.dark') },
          ]}
        />
        <SegmentedControl
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'en', label: t('language.en') },
            { value: 'hi', label: t('language.hi') },
          ]}
        />
      </Block>

      <Block title={t('uiKit.buttons')}>
        <Button label={t('uiKit.primary')} icon="add" onPress={() => toast.info(t('uiKit.primary'))} fullWidth />
        <Button label={t('uiKit.secondary')} variant="secondary" onPress={() => {}} fullWidth />
        <Button label={t('uiKit.destructive')} variant="destructive" icon="trash" onPress={() => {}} fullWidth />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label={t('uiKit.ghost')} variant="ghost" onPress={() => {}} />
          <Button label={t('common.loading')} loading onPress={() => {}} />
          <Button label={t('common.save')} disabled onPress={() => {}} />
        </View>
      </Block>

      <Block title={t('uiKit.inputs')}>
        <Input label={t('uiKit.name')} required value={name} onChangeText={setName} clearable returnKeyType="next" error={name ? undefined : t('uiKit.nameError')} />
        <PhoneInput label={t('uiKit.phone')} required value={phone} onChangeText={setPhone} />
        <AmountInput label={t('uiKit.amount')} value={amount} onChange={setAmount} helper={amount != null ? `${amount} paise` : undefined} />
        <DateField label={t('uiKit.date')} value={date} onChange={setDate} clearable />
        <Select label={t('uiKit.plan')} value={plan} options={planOptions} onChange={setPlan} />
        <MultiSelect label={t('uiKit.plans')} values={plans} options={planOptions} onChange={setPlans} />
      </Block>

      <Block title={t('uiKit.badges')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
          <Badge label="₹1,500 due" tone="danger" />
          <Badge label="PT" color="#DB2777" />
        </View>
      </Block>

      <Block title={t('uiKit.chips')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label={t('uiKit.segmentAll')} selected={chip} count={128} onPress={() => setChip(!chip)} />
          <Chip label={t('status.expiring')} icon="time-outline" count={7} onPress={() => {}} />
        </View>
        <SegmentedControl
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'all', label: t('uiKit.segmentAll') },
            { value: 'active', label: t('uiKit.segmentActive') },
            { value: 'expired', label: t('uiKit.segmentExpired') },
          ]}
        />
      </Block>

      <GroupedSection title={t('uiKit.list')}>
        <ListRow
          title={t('uiKit.rowTitle')}
          subtitle={t('uiKit.rowSubtitle')}
          value={t('uiKit.rowValue')}
          left={<Avatar name="Rahul Sharma" />}
          onPress={() => {}}
        />
        <ListRow title="Priya Patel" subtitle="TP0002" value="₹1,500" valueTone="danger" left={<Avatar name="Priya Patel" />} />
        <ListRow title={t('more.items.backup')} icon="cloud-download" iconBackground="#16A34A" onPress={() => {}} />
      </GroupedSection>

      <Block title={t('uiKit.progress')}>
        <Card>
          <AppText variant="headline">{t('uiKit.planMonthly')}</AppText>
          <AppText variant="stat" tone="brand">
            12
          </AppText>
          <ProgressBar progress={0.6} />
        </Card>
      </Block>

      <Block title={t('uiKit.states')}>
        <Card padded={false}>
          <EmptyState icon="people-outline" message={t('uiKit.emptyMessage')} actionLabel={t('uiKit.emptyAction')} onAction={() => {}} />
        </Card>
        <Card padded={false}>
          <ErrorState onRetry={() => {}} />
        </Card>
        <Card padded={false}>
          <SkeletonList rows={2} />
        </Card>
      </Block>

      <Block title={t('uiKit.dialogs')}>
        <Button
          label={t('uiKit.showConfirm')}
          variant="secondary"
          onPress={async () => {
            const ok = await confirm({ title: t('uiKit.confirmTitle'), message: t('uiKit.confirmMessage'), destructive: true, confirmLabel: t('common.delete') });
            if (ok) toast.success(t('common.done'));
          }}
        />
        <Button
          label={t('uiKit.showTypedConfirm')}
          variant="secondary"
          onPress={async () => {
            const ok = await confirm({ title: t('uiKit.typedTitle'), message: t('uiKit.typedMessage'), destructive: true, typedConfirmation: 'DELETE' });
            if (ok) toast.error(t('common.delete'));
          }}
        />
        <Button label={t('uiKit.showToast')} variant="secondary" onPress={() => toast.success(t('uiKit.toastMessage'))} />
        <Button label={t('uiKit.showSheet')} variant="secondary" onPress={() => setSheetOpen(true)} />
      </Block>

      <Block title={t('uiKit.pin')}>
        <PinKeypad value={pin} onChange={setPin} onBiometric={() => toast.info(t('a11y.useBiometrics'))} />
      </Block>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title={t('uiKit.showSheet')}>
        <AppText style={{ padding: spacing.lg }}>{t('uiKit.sheetBody')}</AppText>
      </BottomSheet>
    </ScreenScroll>
  );
}
