import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
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
    quality: 0.75,
  });

  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

export async function uploadImageFromUri(params: {
  uri: string;
  bucket: string;
  path: string;
  contentType?: string | null;
  maxWidth?: number;
}): Promise<string> {
  let uploadUri = params.uri;
  let contentType = params.contentType ?? 'image/jpeg';

  try {
    const optimized = await ImageManipulator.manipulateAsync(
      params.uri,
      params.maxWidth ? [{ resize: { width: params.maxWidth } }] : [],
      {
        compress: 0.78,
        format: ImageManipulator.SaveFormat.WEBP,
      }
    );
    uploadUri = optimized.uri;
    contentType = 'image/webp';
  } catch {
    // Si el dispositivo no puede convertir a WebP, subimos la imagen original comprimida por el picker.
  }

  let body: ArrayBuffer | Uint8Array;
  if (Platform.OS === 'web') {
    const response = await fetch(uploadUri);
    if (!response.ok) {
      throw new Error('No se pudo preparar la imagen seleccionada.');
    }
    body = await response.arrayBuffer();
  } else {
    const base64 = await FileSystem.readAsStringAsync(uploadUri, {
      encoding: 'base64',
    });
    body = decodeBase64(base64);
  }

  const { error } = await supabase.storage.from(params.bucket).upload(params.path, body, {
    upsert: true,
    contentType,
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
