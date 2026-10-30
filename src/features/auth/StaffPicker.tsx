import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar } from '@/components';
import type { Staff } from '@/db/models';
import { resolvePhotoUri } from '@/services/photos';
import { useTheme } from '@/theme';

/** Lock screen: tap a person, then enter their PIN (§8 multi-staff). */
export function StaffPicker({ staff, onSelect }: { staff: Staff[]; onSelect: (s: Staff) => void }) {
  const { t } = useTranslation();
  const { spacing, colors, radius } = useTheme();
  return (
    <View style={{ gap: spacing.lg, alignItems: 'center' }}>
      <AppText variant="title2" align="center">
        {t('lock.whoIsThis')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.lg }}>
        {staff.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onSelect(s)}
            accessibilityRole="button"
            accessibilityLabel={`${s.name}, ${t(`roles.${s.role}`)}`}
            style={({ pressed }) => ({
              width: 104,
              alignItems: 'center',
              gap: spacing.xs,
              padding: spacing.sm,
              borderRadius: radius.lg,
              backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
            })}
          >
            <Avatar name={s.name} uri={resolvePhotoUri(s.photoUri)} size={72} />
            <AppText variant="subhead" weight="600" align="center" numberOfLines={1}>
              {s.name}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {t(`roles.${s.role}`)}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
