import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import AppDialog from '../../components/AppDialog';
import { StaffScreenHeader } from '../../components/StaffScreenHeader';
import {
  HOME_GALLERY_FOLDER,
  HOME_MAIN_CAROUSEL_FOLDER,
  HOME_PROMO_CAROUSEL_FOLDER,
  PROMO_CAROUSEL_BUCKET,
  listFolderPublicUrls,
  pickImageFromGallery,
  removeStorageObject,
  uploadImageFromUri,
} from '../../utils/storageUpload';

const QR_BUCKET = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_QR_BUCKET?.trim()) || 'payment-assets';
const QR_PATH = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_QR_PATH?.trim()) || 'qr/current.png';
const MAIN_CAROUSEL_SLOTS = ['slide-1', 'slide-2', 'slide-3'];
const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

type PreviewItem = {
  path: string;
  url: string;
};

type SlidePreviewItem = PreviewItem & {
  slot: string;
};

export default function StaffMediaScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [story, setStory] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [showSecondCarousel, setShowSecondCarousel] = useState(true);
  const [galleryVisibleCount, setGalleryVisibleCount] = useState(4);
  const [mainSlides, setMainSlides] = useState<SlidePreviewItem[]>([]);
  const [promoImages, setPromoImages] = useState<PreviewItem[]>([]);
  const [galleryImages, setGalleryImages] = useState<PreviewItem[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const loadMedia = async () => {
    const carouselPromise = supabase.storage.from(PROMO_CAROUSEL_BUCKET).list(HOME_MAIN_CAROUSEL_FOLDER, {
      limit: 20,
      sortBy: { column: 'name', order: 'asc' },
    });
    const settingsPromise = supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['home_story', 'home_testimonial', 'show_second_carousel', 'home_gallery_visible_count']);

    const [settingsRes, promoUrls, galleryUrls, carouselRes] = await Promise.all([
      settingsPromise,
      listFolderPublicUrls(PROMO_CAROUSEL_BUCKET, HOME_PROMO_CAROUSEL_FOLDER, 30).catch(() => []),
      listFolderPublicUrls(PROMO_CAROUSEL_BUCKET, HOME_GALLERY_FOLDER, 30).catch(() => []),
      carouselPromise,
    ]);

    if (settingsRes.error) {
      setDialog({ title: 'No se pudieron cargar los ajustes', message: settingsRes.error.message });
    } else {
      const rows = (settingsRes.data ?? []) as Array<{ key: string; value: string }>;
      const pick = (key: string) => rows.find((row) => row.key === key)?.value ?? '';
      setStory(pick('home_story'));
      setTestimonial(pick('home_testimonial'));
      setShowSecondCarousel(pick('show_second_carousel') === '' ? true : pick('show_second_carousel') === 'true');
      const parsedVisibleCount = Number.parseInt(pick('home_gallery_visible_count') || '4', 10);
      setGalleryVisibleCount(parsedVisibleCount >= 2 && parsedVisibleCount <= 4 ? parsedVisibleCount : 4);
    }

    setPromoImages(
      promoUrls.map((url) => ({
        url,
        path: decodeStoragePath(url, HOME_PROMO_CAROUSEL_FOLDER),
      }))
    );
    setGalleryImages(
      galleryUrls.map((url) => ({
        url,
        path: decodeStoragePath(url, HOME_GALLERY_FOLDER),
      }))
    );

    const carouselFiles = (carouselRes.data ?? []).filter((file) => !!file.name);
    const slidePreviews = MAIN_CAROUSEL_SLOTS.map((slot, index) => {
      const matchedFile = carouselFiles.find((file) => file.name.toLowerCase().startsWith(`${slot}.`));
      const path = `${HOME_MAIN_CAROUSEL_FOLDER}/${matchedFile?.name ?? `${slot}.${index === 2 ? 'png' : 'jpg'}`}`;
      const { data } = supabase.storage.from(PROMO_CAROUSEL_BUCKET).getPublicUrl(path);
      return {
        slot,
        path,
        url: `${data.publicUrl}?v=${Date.now()}`,
      };
    });
    setMainSlides(slidePreviews);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadMedia();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistSecondCarousel = async (value: boolean) => {
    setShowSecondCarousel(value);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'show_second_carousel', value: String(value) }, { onConflict: 'key' });

    if (error) {
      setShowSecondCarousel(!value);
      setDialog({ title: 'No se pudo guardar', message: error.message });
      return;
    }

    setDialog({
      title: 'Guardado',
      message: value
        ? 'Las promociones volveran a mostrarse en el inicio.'
        : 'Las promociones dejaron de mostrarse en el inicio.',
    });
  };

  const persistGalleryVisibleCount = async (value: number) => {
    setGalleryVisibleCount(value);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'home_gallery_visible_count', value: String(value) }, { onConflict: 'key' });

    if (error) {
      setDialog({ title: 'No se pudo guardar', message: error.message });
      return;
    }

    setDialog({
      title: 'Guardado',
      message: `La galeria ahora mostrara ${value} foto${value === 1 ? '' : 's'} en el inicio.`,
    });
  };

  const saveTexts = async () => {
    setSaving(true);
    const { error } = await supabase.from('app_settings').upsert(
      [
        { key: 'home_story', value: story.trim() },
        { key: 'home_testimonial', value: testimonial.trim() },
      ],
      { onConflict: 'key' }
    );
    setSaving(false);

    if (error) {
      setDialog({ title: 'No se pudo guardar', message: error.message });
      return;
    }

    setDialog({ title: 'Guardado', message: 'Los textos del inicio fueron actualizados.' });
  };

  const uploadToPath = async (targetPath: string, successMessage: string) => {
    try {
      setBusyKey(targetPath);
      const asset = await pickImageFromGallery();
      if (!asset?.uri) return;

      await uploadImageFromUri({
        uri: asset.uri,
        bucket: PROMO_CAROUSEL_BUCKET,
        path: targetPath,
        contentType: asset.mimeType ?? 'image/jpeg',
      });

      await loadMedia();
      setDialog({ title: 'Imagen subida', message: successMessage });
    } catch (error) {
      setDialog({
        title: 'No se pudo subir la imagen',
        message: error instanceof Error ? error.message : 'Error al subir la imagen.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const uploadPromoImage = async () => {
    const path = `${HOME_PROMO_CAROUSEL_FOLDER}/promo-${Date.now()}.jpg`;
    await uploadToPath(path, 'La promocion ya esta lista para mostrarse en el inicio.');
  };

  const uploadGalleryImage = async () => {
    const path = `${HOME_GALLERY_FOLDER}/gallery-${Date.now()}.jpg`;
    await uploadToPath(path, 'La imagen ya fue agregada a la galeria del inicio.');
  };

  const resolveAssetExtension = (mimeType?: string | null, uri?: string) => {
    if (mimeType?.includes('png')) return 'png';
    if (mimeType?.includes('webp')) return 'webp';
    if (mimeType?.includes('jpeg') || mimeType?.includes('jpg')) return 'jpg';
    const ext = uri?.split('.').pop()?.toLowerCase();
    if (ext && SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
    return 'jpg';
  };

  const replaceMainSlide = async (slot: string) => {
    try {
      setBusyKey(slot);
      const asset = await pickImageFromGallery();
      if (!asset?.uri) return;

      const extension = resolveAssetExtension(asset.mimeType, asset.uri);
      const targetPath = `${HOME_MAIN_CAROUSEL_FOLDER}/${slot}.${extension}`;
      const stalePaths = SUPPORTED_IMAGE_EXTENSIONS
        .map((ext) => `${HOME_MAIN_CAROUSEL_FOLDER}/${slot}.${ext}`)
        .filter((path) => path !== targetPath);

      if (stalePaths.length) {
        await supabase.storage.from(PROMO_CAROUSEL_BUCKET).remove(stalePaths);
      }

      await uploadImageFromUri({
        uri: asset.uri,
        bucket: PROMO_CAROUSEL_BUCKET,
        path: targetPath,
        contentType: asset.mimeType ?? 'image/jpeg',
      });

      await loadMedia();
      setDialog({ title: 'Slide actualizado', message: `El ${slot.replace('-', ' ')} fue actualizado correctamente.` });
    } catch (error) {
      setDialog({
        title: 'No se pudo subir la imagen',
        message: error instanceof Error ? error.message : 'Error al actualizar el slide.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const replaceGalleryImage = async (item: PreviewItem) => {
    await uploadToPath(item.path, 'La imagen de la galeria fue reemplazada correctamente.');
  };

  const removeImage = async (path: string, successMessage: string) => {
    try {
      setBusyKey(path);
      await removeStorageObject(PROMO_CAROUSEL_BUCKET, path);
      await loadMedia();
      setDialog({ title: 'Imagen eliminada', message: successMessage });
    } catch (error) {
      setDialog({
        title: 'No se pudo eliminar',
        message: error instanceof Error ? error.message : 'Error al eliminar la imagen.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]} edges={['top', 'left', 'right']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <StaffScreenHeader title="Inicio y promociones" navigation={navigation} />
        <Text style={styles.sub}>Gestiona las imagenes del inicio directamente desde la galeria de tu celular.</Text>

        <View style={styles.card}>
          <Text style={styles.h}>Carrusel principal</Text>
          <Text style={styles.t}>Estas tres imagenes aparecen en la parte superior del inicio.</Text>
          {mainSlides.map((slide, index) => (
            <View key={slide.path} style={styles.mediaRow}>
              <Image source={{ uri: slide.url }} style={styles.preview} />
              <View style={styles.mediaInfo}>
                <Text style={styles.mediaTitle}>Slide {index + 1}</Text>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => void replaceMainSlide(slide.slot)}
                  disabled={busyKey === slide.slot}
                >
                  {busyKey === slide.slot ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Cambiar foto</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Promociones de la semana</Text>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.t}>Mostrar segundo carrusel en el inicio</Text>
              <Text style={styles.small}>Si lo desactivas, desaparece por completo del inicio del cliente.</Text>
            </View>
            <Switch
              value={showSecondCarousel}
              onValueChange={(value) => void persistSecondCarousel(value)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => void uploadPromoImage()} disabled={busyKey === 'promo-upload'}>
            <Text style={styles.btnTxt}>Subir promocion desde galeria</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
            {promoImages.length ? (
              promoImages.map((item) => (
                <View key={item.path} style={styles.thumbCard}>
                  <Image source={{ uri: item.url }} style={styles.thumb} />
                  <View style={styles.iconStack}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => void uploadToPath(item.path, 'La promocion fue reemplazada correctamente.')}
                      disabled={busyKey === item.path}
                    >
                      {busyKey === item.path ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="edit-2" size={15} color="#fff" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => void removeImage(item.path, 'La promocion fue eliminada del carrusel.')}
                      disabled={busyKey === item.path}
                    >
                      {busyKey === item.path ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="trash-2" size={16} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.small}>Todavia no hay promociones cargadas.</Text>
            )}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Galeria del inicio</Text>
          <Text style={styles.t}>Estas imagenes se muestran en la seccion de galeria del inicio.</Text>
          <Text style={styles.mediaTitle}>Fotos visibles en el inicio</Text>
          <View style={styles.optionRow}>
            {[2, 3, 4].map((count) => {
              const active = galleryVisibleCount === count;
              return (
                <TouchableOpacity
                  key={`gallery-count-${count}`}
                  style={[styles.optionChip, active && styles.optionChipActive]}
                  onPress={() => void persistGalleryVisibleCount(count)}
                >
                  <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{count} fotos</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => void uploadGalleryImage()}>
            <Text style={styles.btnTxt}>Agregar foto desde galeria</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
            {galleryImages.length ? (
              galleryImages.map((item) => (
                <View key={item.path} style={styles.thumbCard}>
                  <Image source={{ uri: item.url }} style={styles.thumb} />
                  <View style={styles.iconStack}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => void replaceGalleryImage(item)}
                      disabled={busyKey === item.path}
                    >
                      {busyKey === item.path ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="edit-2" size={15} color="#fff" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => void removeImage(item.path, 'La imagen fue eliminada de la galeria del inicio.')}
                      disabled={busyKey === item.path}
                    >
                      {busyKey === item.path ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="trash-2" size={16} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.small}>Todavia no hay imagenes en la galeria.</Text>
            )}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Textos del inicio</Text>
          <TextInput
            style={[styles.input, { minHeight: 92 }]}
            multiline
            value={story}
            onChangeText={setStory}
            placeholder="Historia de la barberia"
            placeholderTextColor={colors.subtext}
          />
          <TextInput
            style={[styles.input, { minHeight: 72 }]}
            multiline
            value={testimonial}
            onChangeText={setTestimonial}
            placeholder="Frase o testimonio destacado"
            placeholderTextColor={colors.subtext}
          />
          <TouchableOpacity style={styles.btn} onPress={() => void saveTexts()} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Guardar textos</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>QR de pago</Text>
          <Text style={styles.t}>Bucket: {QR_BUCKET}</Text>
          <Text style={styles.t}>Ruta: {QR_PATH}</Text>
        </View>

        <AppDialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} onClose={() => setDialog(null)} />
      </ScrollView>
    </SafeAreaView>
  );
}

function decodeStoragePath(url: string, folder: string): string {
  const marker = `/${PROMO_CAROUSEL_BUCKET}/${folder}/`;
  const index = url.indexOf(marker);
  if (index >= 0) {
    const fileName = url.slice(index + marker.length).split('?')[0];
    return `${folder}/${fileName}`;
  }
  return `${folder}/${Date.now()}`;
}

function createStyles(colors: { primary: string; background: string; card: string; text: string; subtext: string; border: string }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 24 },
    sub: { color: colors.subtext, marginBottom: 12 },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      backgroundColor: colors.card,
    },
    h: { color: colors.text, fontWeight: '800', marginBottom: 6, fontSize: 16 },
    t: { color: colors.subtext, marginBottom: 4 },
    small: { color: colors.subtext, fontSize: 12, marginTop: 6 },
    mediaRow: { flexDirection: 'row', gap: 12, marginTop: 10, alignItems: 'center' },
    mediaInfo: { flex: 1, gap: 8 },
    mediaTitle: { color: colors.text, fontWeight: '700' },
    preview: { width: 110, height: 76, borderRadius: 12, backgroundColor: colors.border },
    btn: {
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      marginTop: 8,
    },
    btnTxt: { color: '#fff', fontWeight: '700' },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.background,
      marginBottom: 10,
      textAlignVertical: 'top',
    },
    switchRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    horizontalList: { marginTop: 10 },
    thumbCard: { marginRight: 10, position: 'relative' },
    thumb: { width: 140, height: 95, borderRadius: 12, backgroundColor: colors.border },
    iconStack: { position: 'absolute', top: 8, right: 8, gap: 6 },
    iconBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 6, flexWrap: 'wrap' },
    optionChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },
    optionChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionChipText: {
      color: colors.text,
      fontWeight: '700',
    },
    optionChipTextActive: {
      color: '#fff',
    },
  });
}
