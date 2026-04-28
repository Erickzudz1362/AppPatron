import type { ImageSourcePropType } from 'react-native';

/** Debe coincidir con los archivos en `assets/avatars/` (incluidos en el bundle, no en la BD). */
export const PROFILE_AVATAR_COUNT = 12;

/**
 * Imágenes locales: reemplaza los PNG en `assets/avatars/` manteniendo los nombres:
 *   avatar-01.png … avatar-12.png
 * (mismo tamaño recomendado, p. ej. 256×256 o 512×512, cuadradas.)
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

/** Prefijo en `profiles.photo_url`: `builtin:0` … `builtin:11` (12 avatares). */
export function getAvatarIndexFromPhotoUrl(photoUrl: string | null | undefined): number {
  // Default explícito: avatar 1 (índice 0).
  if (!photoUrl || typeof photoUrl !== 'string') return 0;
  const m = /^builtin:(\d+)$/.exec(photoUrl.trim());
  if (!m) return 0;
  return Math.min(PROFILE_AVATAR_COUNT - 1, Math.max(0, parseInt(m[1], 10)));
}

export function photoUrlFromAvatarIndex(index: number): string {
  return `builtin:${Math.min(PROFILE_AVATAR_COUNT - 1, Math.max(0, index))}`;
}

export function getAvatarImageSource(index: number): ImageSourcePropType {
  const i = Math.min(PROFILE_AVATAR_COUNT - 1, Math.max(0, index));
  return BUILTIN_AVATARS[i];
}
