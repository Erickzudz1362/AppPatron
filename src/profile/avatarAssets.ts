import type { ImageSourcePropType } from 'react-native';
import { supabase } from '../config/supabase';
import { APP_AVATARS_FOLDER, PROMO_CAROUSEL_BUCKET } from '../utils/storageUpload';

/** Debe coincidir con los slots configurables desde admin en Storage. */
export const PROFILE_AVATAR_COUNT = 12;

/**
 * Fallback local para que la app nunca se quede sin avatar aunque Storage
 * todavia no tenga todos los archivos cargados.
 */
const BUILTIN_AVATARS: ImageSourcePropType[] = [
  require('../../assets/avatars/avatar-01.png'),
  require('../../assets/avatars/avatar-02.png'),
  require('../../assets/avatars/avatar-03.png'),
  require('../../assets/avatars/avatar-04.png'),
  require('../../assets/avatars/avatar-05.png'),
  require('../../assets/avatars/avatar-06.png'),
  require('../../assets/avatars/avatar-07.png'),
  require('../../assets/avatars/avatar-08.png'),
  require('../../assets/avatars/avatar-09.png'),
  require('../../assets/avatars/avatar-10.png'),
  require('../../assets/avatars/avatar-11.png'),
  require('../../assets/avatars/avatar-12.png'),
];

/** Prefijo en `profiles.photo_url`: `builtin:0` … `builtin:11`. */
export function getAvatarIndexFromPhotoUrl(photoUrl: string | null | undefined): number {
  if (!photoUrl || typeof photoUrl !== 'string') return 0;
  const m = /^builtin:(\d+)$/.exec(photoUrl.trim());
  if (!m) return 0;
  return Math.min(PROFILE_AVATAR_COUNT - 1, Math.max(0, parseInt(m[1], 10)));
}

export function isBuiltinAvatarPhotoUrl(photoUrl: string | null | undefined): boolean {
  return typeof photoUrl === 'string' && /^builtin:\d+$/i.test(photoUrl.trim());
}

export function photoUrlFromAvatarIndex(index: number): string {
  return `builtin:${Math.min(PROFILE_AVATAR_COUNT - 1, Math.max(0, index))}`;
}

export function getAvatarFallbackImageSource(index: number): ImageSourcePropType {
  const i = Math.min(PROFILE_AVATAR_COUNT - 1, Math.max(0, index));
  return BUILTIN_AVATARS[i];
}

export function getAvatarStoragePath(index: number): string {
  const safe = Math.min(PROFILE_AVATAR_COUNT - 1, Math.max(0, index)) + 1;
  return `${APP_AVATARS_FOLDER}/avatar-${String(safe).padStart(2, '0')}.jpg`;
}

export function getAvatarPublicUrl(index: number, version?: string | number): string {
  const path = getAvatarStoragePath(index);
  const { data } = supabase.storage.from(PROMO_CAROUSEL_BUCKET).getPublicUrl(path);
  const suffix = version == null ? '' : `?v=${encodeURIComponent(String(version))}`;
  return `${data.publicUrl}${suffix}`;
}
