// Photos: pick from the library or camera, resize to max 800 px, JPEG 0.7 (CLAUDE.md §1),
// and keep a copy inside the app's Documents folder so it is included in backups.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { newId } from '@/utils/id';
import { logger } from '@/utils/logger';

export type PhotoKind = 'logo' | 'members' | 'staff' | 'receipts' | 'progress';
export type PhotoSource = 'library' | 'camera';

export type PhotoResult =
  /** `uri` is the Documents-relative path to store; show it via `resolvePhotoUri`. */
  | { ok: true; uri: string }
  | { ok: false; reason: 'cancelled' | 'permission' | 'storage' | 'failed' };

const MAX_SIZE = 800;

function isStorageFull(e: unknown): boolean {
  return /space|ENOSPC|full/i.test(String(e));
}

/** Square-crop picker (members, staff, logo) or free crop (receipts). */
export async function pickPhoto(kind: PhotoKind, source: PhotoSource = 'library'): Promise<PhotoResult> {
  try {
    const perm =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'permission' };

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: kind === 'receipts' ? undefined : [1, 1],
      quality: 1,
    };
    const picked = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return { ok: false, reason: 'cancelled' };

    const longest = Math.max(asset.width, asset.height);
    const context = ImageManipulator.manipulate(asset.uri);
    if (longest > MAX_SIZE) {
      context.resize(asset.width >= asset.height ? { width: MAX_SIZE, height: null } : { width: null, height: MAX_SIZE });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });

    const dir = new Directory(Paths.document, 'photos', kind);
    dir.create({ intermediates: true, idempotent: true });
    const relative = `photos/${kind}/${newId()}.jpg`;
    await new File(saved.uri).copy(new File(Paths.document, relative));
    return { ok: true, uri: relative };
  } catch (e) {
    logger.warn('Photo pick failed', e);
    return { ok: false, reason: isStorageFull(e) ? 'storage' : 'failed' };
  }
}

/**
 * Stored photo paths are RELATIVE to Documents (e.g. "photos/members/<id>.jpg"): iOS moves
 * the app container on updates, so absolute file:// paths would break. Resolve for display.
 */
export function resolvePhotoUri(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(file|https?|data):/.test(path)) return path;
  try {
    return new File(Paths.document, path).uri;
  } catch {
    return null;
  }
}

/** Best-effort removal of a replaced photo. */
export function deletePhoto(path: string | null | undefined): void {
  const uri = resolvePhotoUri(path);
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    logger.warn('Photo delete failed', e);
  }
}
