import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, BottomSheet, ListRow } from '@/components';
import { pickPhoto, resolvePhotoUri, type PhotoSource } from '@/services/photos';
import { toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';

/** Member photo: camera or library, square crop, 800 px JPEG (§10.2, CLAUDE.md §1). */
export function PhotoField({ name, value, onChange }: { name: string; value: string | null; onChange: (path: string | null) => void }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const pick = async (source: PhotoSource) => {
    setOpen(false);
    const r = await pickPhoto('members', source);
    if (r.ok) onChange(r.uri);
    else if (r.reason === 'permission') toast.error(source === 'camera' ? t('photos.cameraPermission') : t('photos.permission'));
    else if (r.reason === 'storage') toast.error(t('photos.storageFull'));
    else if (r.reason === 'failed') toast.error(t('photos.failed'));
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t('members.form.photo')} style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={name || '?'} uri={resolvePhotoUri(value)} size={96} />
        <AppText variant="subhead" tone="brand">
          {value ? t('members.form.changePhoto') : t('members.form.addPhoto')}
        </AppText>
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t('members.form.photo')}>
        <View style={{ marginHorizontal: -spacing.lg }}>
          <ListRow title={t('members.form.takePhoto')} icon="camera" iconBackground={colors.info} onPress={() => pick('camera')} />
          <ListRow title={t('members.form.choosePhoto')} icon="images" iconBackground={colors.success} onPress={() => pick('library')} />
          {value ? (
            <ListRow
              title={t('members.form.removePhoto')}
              icon="trash"
              iconBackground={colors.danger}
              destructive
              onPress={() => {
                // The old file is cleaned up when the member is saved/purged, not here,
                // so cancelling the form never loses the existing photo.
                onChange(null);
                setOpen(false);
              }}
            />
          ) : null}
        </View>
      </BottomSheet>
    </>
  );
}
