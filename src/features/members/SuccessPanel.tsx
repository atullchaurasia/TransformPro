import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, GroupedSection, Icon, ListRow } from '@/components';
import type { NewMemberResult } from '@/db/repositories/memberCreate';
import { firstName } from '@/domain/templates';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { ReceiptActions } from '@/features/payments/ReceiptActions';
import { openWhatsApp } from '@/services/messaging';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { brand, useTheme } from '@/theme';

export type SuccessPanelProps = { result: NewMemberResult; onAddAnother: () => void; onDone: () => void };

/**
 * After saving a new member (§10.2): welcome, receipt, card, add another, done. Shown on the
 * screen (not in a sheet) so the share sheet can open on top of it (iOS).
 */
export function SuccessPanel({ result, onAddAnother, onDone }: SuccessPanelProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { gym_name } = useSettings();
  const { member, payments } = result;

  const welcome = async () => {
    // TODO(M14): use the "welcome" template with all placeholders.
    const text = t('members.success.welcomeText', { name: firstName(member.fullName), gym: gym_name, code: member.memberCode });
    if ((await openWhatsApp(member.phone, text)) === 'unavailable') toast.error(t('members.cantWhatsApp'));
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Icon name="checkmark-circle" size={56} color={colors.success} />
        <AppText variant="title3" align="center">
          {t('members.success.title')}
        </AppText>
        <AppText variant="subhead" tone="secondary" align="center">
          {t('members.success.message', { name: member.fullName, code: member.memberCode })}
        </AppText>
      </View>
      {payments.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="footnote" tone="secondary" weight="600">
            {t('members.success.receipt').toUpperCase()}
          </AppText>
          <ReceiptActions paymentIds={payments.map((p) => p.id)} />
        </View>
      ) : null}
      <View style={{ marginHorizontal: -spacing.lg }}>
        <GroupedSection>
          <ListRow title={t('members.success.welcome')} icon="logo-whatsapp" iconBackground={brand.whatsapp} onPress={welcome} />
          {/* TODO(M13): share the membership card PNG. */}
          <ListRow title={t('members.success.card')} icon="card-outline" iconBackground={colors.primary} onPress={() => openComingSoon('M13', t('members.success.card'))} />
        </GroupedSection>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button label={t('members.success.addAnother')} variant="secondary" onPress={onAddAnother} style={{ flex: 1 }} />
        <Button label={t('common.done')} onPress={onDone} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
