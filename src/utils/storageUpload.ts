import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';

export const BARBER_PHOTOS_BUCKET = 'barber-photos';
export const PROMO_CAROUSEL_BUCKET =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_HOME_CAROUSEL_BUCKET?.trim()) || 'home-carousel';
export const APP_AVATARS_FOLDER = 'avatars';
export const HOME_GALLERY_FOLDER = 'gallery';
export const HOME_MAIN_CAROUSEL_FOLDER = 'carousel';
export const HOME_PROMO_CAROUSEL_FOLDER = 'PromoCarousel';

function decodeBase64(base64: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  throw new Error('No se pudo preparar la imagen para subirla.');
}

async function ensureGalleryPermission(): Promise<boolean> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

export async function pickImageFromGallery(): Promise<ImagePicker.ImagePickerAsset | null> {
  const granted = await ensureGalleryPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.9,
  });

  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

export async function uploadImageFromUri(params: {
  uri: string;
  bucket: string;
  path: string;
  contentType?: string | null;
}): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(params.uri, {
    encoding: 'base64',
  });

  const bytes = decodeBase64(base64);

  const { error } = await supabase.storage.from(params.bucket).upload(params.path, bytes, {
    upsert: true,
    contentType: params.contentType ?? 'image/jpeg',
  });

  if (error) throw error;

  const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
  return data.publicUrl;
}

export async function listFolderPublicUrls(bucket: string, folder: string, limit = 20): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) throw error;

  return (data ?? [])
    .filter((file) => !!file.name && !file.name.endsWith('/'))
    .map((file) => supabase.storage.from(bucket).getPublicUrl(`${folder}/${file.name}`).data.publicUrl);
}

export async function removeStorageObject(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
