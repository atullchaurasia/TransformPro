import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, BottomSheet, Button, ListRow } from '@/components';
import type { Member } from '@/db/models';
import { formatPhone } from '@/domain/phones';
import { resolvePhotoUri } from '@/services/photos';
import { useTheme } from '@/theme';

export type DuplicatePhoneSheetProps = {
  matches: Member[];
  onOpen: (m: Member) => void;
  onContinue: () => void;
  onClose: () => void;
};

/** "This phone number already belongs to…" with "Open existing" (§6.9). */
export function DuplicatePhoneSheet({ matches, onOpen, onContinue, onClose }: DuplicatePhoneSheetProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  return (
    <BottomSheet visible={matches.length > 0} onClose={onClose} title={t('members.duplicate.title')}>
      <View style={{ gap: spacing.md, paddingBottom: spacing.md, paddingHorizontal: spacing.lg }}>
        <AppText tone="secondary">{t('members.duplicate.message', { count: matches.length })}</AppText>
        <View style={{ marginHorizontal: -spacing.lg }}>
          {matches.map((m) => (
            <ListRow
              key={m.id}
              title={m.fullName}
              subtitle={`${m.memberCode} · ${formatPhone(m.phone)}${m.deletedAt ? ` · ${t('members.duplicate.inTrash')}` : ''}`}
              left={<Avatar name={m.fullName} uri={resolvePhotoUri(m.photoUri)} size={40} />}
              value={t('members.duplicate.open')}
              valueTone="brand"
              onPress={() => onOpen(m)}
            />
          ))}
        </View>
        <Button label={t('members.duplicate.continue')} variant="secondary" onPress={onContinue} fullWidth />
      </View>
    </BottomSheet>
  );
}
