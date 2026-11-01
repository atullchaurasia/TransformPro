import { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheet, Button, DateField, ListRow, MultiSelect, SegmentedControl, Select } from '@/components';
import type { Branch, Gender, Plan, Staff } from '@/db/models';
import { NO_FILTERS, type MemberFilters } from '@/domain/memberList';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';

export type FiltersSheetProps = {
  visible: boolean;
  onClose: () => void;
  value: MemberFilters;
  onApply: (f: MemberFilters) => void;
  plans: Plan[];
  trainers: Staff[];
  branches: Branch[];
};

type GenderChoice = Gender | 'any';
const ANY = '__any__';

/** All member filters from §10.2. Branch is hidden while there is only one branch (§10.14). */
export function FiltersSheet({ visible, onClose, value, onApply, plans, trainers, branches }: FiltersSheetProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { date_format } = useSettings();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const toggle = (key: 'hasDues' | 'birthdayThisMonth' | 'ptMembers', label: string) => (
    <ListRow title={label} right={<Switch value={draft[key]} onValueChange={(v) => setDraft({ ...draft, [key]: v })} accessibilityLabel={label} />} />
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('members.filters.title')}>
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ marginHorizontal: -spacing.lg }}>
          {toggle('hasDues', t('members.filters.hasDues'))}
          {toggle('birthdayThisMonth', t('members.filters.birthday'))}
          {toggle('ptMembers', t('members.filters.pt'))}
        </View>
        <SegmentedControl<GenderChoice>
          value={draft.gender ?? 'any'}
          onChange={(g) => setDraft({ ...draft, gender: g === 'any' ? null : g })}
          options={[
            { value: 'any', label: t('members.filters.anyGender') },
            { value: 'male', label: t('members.gender.male') },
            { value: 'female', label: t('members.gender.female') },
            { value: 'other', label: t('members.gender.other') },
          ]}
        />
        <MultiSelect
          label={t('members.filters.plans')}
          values={draft.planIds}
          onChange={(planIds) => setDraft({ ...draft, planIds })}
          options={plans.map((p) => ({ value: p.id, label: p.name, color: p.color ?? undefined }))}
        />
        <Select
          label={t('members.filters.trainer')}
          value={draft.trainerId ?? ANY}
          onChange={(v) => setDraft({ ...draft, trainerId: v === ANY ? null : v })}
          options={[{ value: ANY, label: t('members.filters.anyone') }, ...trainers.map((s) => ({ value: s.id, label: s.name }))]}
        />
        {branches.length > 1 ? (
          <Select
            label={t('members.filters.branch')}
            value={draft.branchId ?? ANY}
            onChange={(v) => setDraft({ ...draft, branchId: v === ANY ? null : v })}
            options={[{ value: ANY, label: t('members.filters.allBranches') }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
          />
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <DateField label={t('members.filters.joinedFrom')} value={draft.joinedFrom} onChange={(joinedFrom) => setDraft({ ...draft, joinedFrom })} clearable dateFormat={date_format} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label={t('members.filters.joinedTo')}
              value={draft.joinedTo}
              onChange={(joinedTo) => setDraft({ ...draft, joinedTo })}
              minimumDate={draft.joinedFrom ?? undefined}
              clearable
              dateFormat={date_format}
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label={t('members.filters.reset')} variant="secondary" onPress={() => setDraft({ ...NO_FILTERS, status: draft.status })} style={{ flex: 1 }} />
          <Button
            label={t('members.filters.apply')}
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={{ flex: 2 }}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
