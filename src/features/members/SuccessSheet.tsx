import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet, Button, Icon, ListRow } from '@/components';
import type { NewMemberResult } from '@/db/repositories/memberCreate';
import { firstName } from '@/domain/templates';
import { openComingSoon } from '@/features/navigation/comingSoon';
import { openWhatsApp } from '@/services/messaging';
import { toast } from '@/store/feedbackStore';
import { useSettings } from '@/store/settingsStore';
import { brand, useTheme } from '@/theme';

export type SuccessSheetProps = { result: NewMemberResult | null; onAddAnother: () => void; onDone: () => void };

/** After saving a new member (§10.2): welcome, receipt, card, add another, done. */
export function SuccessSheet({ result, onAddAnother, onDone }: SuccessSheetProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { gym_name } = useSettings();
  if (!result) return null;
  const { member, payments } = result;

  const welcome = async () => {
    // TODO(M14): use the "welcome" template with all placeholders.
    const text = t('members.success.welcomeText', { name: firstName(member.fullName), gym: gym_name, code: member.memberCode });
    if ((await openWhatsApp(member.phone, text)) === 'unavailable') toast.error(t('members.cantWhatsApp'));
  };

  return (
    <BottomSheet visible onClose={onDone} title={t('members.success.title')}>
      <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Icon name="checkmark-circle" size={56} color={colors.success} />
          <AppText variant="headline" align="center">
            {t('members.success.message', { name: member.fullName, code: member.memberCode })}
          </AppText>
        </View>
        <View style={{ marginHorizontal: -spacing.lg }}>
          <ListRow title={t('members.success.welcome')} icon="logo-whatsapp" iconBackground={brand.whatsapp} onPress={welcome} />
          {payments.length > 0 ? (
            // TODO(M08): share the receipt PDF(s) for `payments`.
            <ListRow title={t('members.success.receipt')} icon="receipt-outline" iconBackground={colors.info} onPress={() => openComingSoon('M08', t('members.success.receipt'))} />
          ) : null}
          {/* TODO(M13): share the membership card PNG. */}
          <ListRow title={t('members.success.card')} icon="card-outline" iconBackground={colors.primary} onPress={() => openComingSoon('M13', t('members.success.card'))} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label={t('members.success.addAnother')} variant="secondary" onPress={onAddAnother} style={{ flex: 1 }} />
          <Button label={t('common.done')} onPress={onDone} style={{ flex: 1 }} />
        </View>
      </View>
    </BottomSheet>
  );
}
