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

const webPickedFiles = new Map<string, File>();

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
  if (Platform.OS === 'web') return true;
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

function pickWebImageFromGallery(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg,image/webp';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';

    const cleanup = () => {
      input.remove();
    };

    input.onchange = () => {
      const file = input.files?.[0];
      cleanup();

      if (!file) {
        resolve(null);
        return;
      }

      const uri = URL.createObjectURL(file);
      webPickedFiles.set(uri, file);
      resolve({
        uri,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        width: 0,
        height: 0,
      } as ImagePicker.ImagePickerAsset);
    };

    input.oncancel = () => {
      cleanup();
      resolve(null);
    };

    document.body.appendChild(input);
    input.click();
  });
}

export async function pickImageFromGallery(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (Platform.OS === 'web') {
    return pickWebImageFromGallery();
  }

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

async function compressWebImage(
  file: File,
  maxWidth?: number
): Promise<{ body: Blob | File; contentType: string }> {
  if (typeof document === 'undefined' || !file.type.startsWith('image/')) {
    return { body: file, contentType: file.type || 'image/jpeg' };
  }

  try {
    const imageUrl = URL.createObjectURL(file);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const scale = maxWidth && image.width > maxWidth ? maxWidth / image.width : 1;
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(imageUrl);
      return { body: file, contentType: file.type || 'image/jpeg' };
    }

    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    URL.revokeObjectURL(imageUrl);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/webp', 0.78);
    });

    if (blob) {
      return { body: blob, contentType: 'image/webp' };
    }
  } catch {
    // Si el navegador no permite comprimir, subimos el archivo original.
  }

  return { body: file, contentType: file.type || 'image/jpeg' };
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

  if (Platform.OS === 'web') {
    const pickedFile = webPickedFiles.get(params.uri);
    let body: Blob | File;

    if (pickedFile) {
      const optimized = await compressWebImage(pickedFile, params.maxWidth);
      body = optimized.body;
      contentType = optimized.contentType;
    } else {
      const response = await fetch(uploadUri);
      if (!response.ok) {
        throw new Error('No se pudo preparar la imagen seleccionada.');
      }
      body = await response.blob();
      contentType = body.type || contentType;
    }

    const { error } = await supabase.storage.from(params.bucket).upload(params.path, body, {
      upsert: true,
      contentType,
    });

    if (pickedFile) {
      webPickedFiles.delete(params.uri);
      try {
        URL.revokeObjectURL(params.uri);
      } catch {
        // El URI puede no ser un object URL en todos los navegadores.
      }
    }

    if (error) throw error;

    const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
    return data.publicUrl;
  }

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

  const base64 = await FileSystem.readAsStringAsync(uploadUri, {
    encoding: 'base64',
  });
  const body = decodeBase64(base64);

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
