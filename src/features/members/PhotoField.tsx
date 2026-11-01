import { useState } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ActionSheet, AppText, Avatar } from '@/components';
import { pickPhoto, resolvePhotoUri, type PhotoSource } from '@/services/photos';
import { toast } from '@/store/feedbackStore';
import { useTheme } from '@/theme';

type Choice = 'camera' | 'library' | 'remove';

/** Member photo: camera or library, square crop, 800 px JPEG (§10.2, CLAUDE.md §1). */
export function PhotoField({ name, value, onChange }: { name: string; value: string | null; onChange: (path: string | null) => void }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const pick = async (source: PhotoSource) => {
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
      {/* The camera / library picker is presented only after the sheet has closed (iOS). */}
      <ActionSheet<Choice>
        visible={open}
        onClose={() => setOpen(false)}
        title={t('members.form.photo')}
        items={[
          { key: 'camera', label: t('members.form.takePhoto'), icon: 'camera', color: colors.info },
          { key: 'library', label: t('members.form.choosePhoto'), icon: 'images', color: colors.success },
          ...(value ? [{ key: 'remove' as const, label: t('members.form.removePhoto'), icon: 'trash' as const, destructive: true }] : []),
        ]}
        onSelect={(c) => {
          // The old file is cleaned up when the member is saved/purged, not here,
          // so cancelling the form never loses the existing photo.
          if (c === 'remove') onChange(null);
          else void pick(c);
        }}
      />
    </>
  );
}
