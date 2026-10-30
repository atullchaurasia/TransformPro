import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, GroupedSection } from '@/components';
import type { Member } from '@/db/models';
import { ageOn, maskIdNumber } from '@/domain/memberList';
import { formatPhone } from '@/domain/phones';
import { useMemberLabels } from '@/features/members/useMemberLabels';
import { useTheme } from '@/theme';

/** Contact, health, emergency and ID details. Aadhaar shows only the last 4 digits (§10.2). */
export function MemberDetails({ member: m, today }: { member: Member; today: string }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const labels = useMemberLabels();
  const age = ageOn(m.dateOfBirth, today);
  const address = [m.address, m.area, m.city, m.pincode].filter(Boolean).join(', ');
  const rows: { key: string; title: string; value: string }[] = [
    { key: 'alt', title: t('members.form.altPhone'), value: m.altPhone ? formatPhone(m.altPhone) : '' },
    { key: 'email', title: t('members.form.email'), value: m.email ?? '' },
    { key: 'gender', title: t('members.form.gender'), value: m.gender ? t(`members.gender.${m.gender}`) : '' },
    { key: 'dob', title: t('members.form.dob'), value: m.dateOfBirth ? `${labels.date(m.dateOfBirth)}${age != null ? ` · ${t('members.form.age', { count: age })}` : ''}` : '' },
    { key: 'anniversary', title: t('members.form.anniversary'), value: labels.date(m.anniversaryDate) },
    { key: 'address', title: t('members.form.address'), value: address },
    { key: 'occupation', title: t('members.form.occupation'), value: m.occupation ?? '' },
    { key: 'blood', title: t('members.form.bloodGroup'), value: m.bloodGroup ?? '' },
    { key: 'height', title: t('members.form.height'), value: m.heightCm ? String(m.heightCm) : '' },
    { key: 'medical', title: t('members.form.medical'), value: m.medicalConditions ?? '' },
    { key: 'goal', title: t('members.form.goal'), value: m.fitnessGoal ? t(`members.goal.${m.fitnessGoal}`) : '' },
    { key: 'source', title: t('members.form.source'), value: m.source ? t(`members.source.${m.source}`) : '' },
    {
      key: 'emergency',
      title: t('members.form.emergency'),
      value: [m.emergencyContactName, m.emergencyContactRelation, m.emergencyContactPhone ? formatPhone(m.emergencyContactPhone) : null].filter(Boolean).join(' · '),
    },
    {
      key: 'id',
      title: m.idProofType ? t(`members.idProof.${m.idProofType as 'aadhaar'}`) : t('members.form.idProof'),
      value: maskIdNumber(m.idProofType, m.idProofNumber),
    },
  ].filter((r) => r.value);

  if (rows.length === 0) return null;
  // Label above value so long text (address, medical conditions) wraps instead of truncating.
  return (
    <GroupedSection title={t('profile.details')}>
      {rows.map((r) => (
        <View key={r.key} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, gap: 2 }}>
          <AppText variant="footnote" tone="secondary">
            {r.title}
          </AppText>
          <AppText variant="body">{r.value}</AppText>
        </View>
      ))}
    </GroupedSection>
  );
}
