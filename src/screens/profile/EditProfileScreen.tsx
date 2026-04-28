import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { BARBER_PHOTOS_BUCKET, pickImageFromGallery, uploadImageFromUri } from '../../utils/storageUpload';
import {
  PROFILE_AVATAR_COUNT,
  getAvatarIndexFromPhotoUrl,
  photoUrlFromAvatarIndex,
} from '../../profile/avatarAssets';

const MS_PER_DAY = 86400000;
const NAME_COOLDOWN_DAYS = 30;

/** Primera fila 6 avatares, segunda 4 (10 en total). */
const AVATAR_GRID_COLS = 6;
const AVATAR_GRID_GAP = 10;
const SCROLL_HORIZONTAL_PAD = 20;

function canChangeName(nameChangedAt: string | null | undefined): boolean {
  if (!nameChangedAt) return true;
  const last = new Date(nameChangedAt).getTime();
  if (Number.isNaN(last)) return true;
  return Date.now() - last >= NAME_COOLDOWN_DAYS * MS_PER_DAY;
}

function daysUntilNameAllowed(nameChangedAt: string | null | undefined): number {
  if (!nameChangedAt) return 0;
  const last = new Date(nameChangedAt).getTime();
  if (Number.isNaN(last)) return 0;
  const left = NAME_COOLDOWN_DAYS * MS_PER_DAY - (Date.now() - last);
  return Math.max(0, Math.ceil(left / MS_PER_DAY));
}

/** Fecha del último cambio de nombre: vive en `user_metadata` de Supabase Auth (no hace falta columna en `profiles`). */
function getNameChangedAtFromSession(userMetadata: unknown): string | undefined {
  if (!userMetadata || typeof userMetadata !== 'object') return undefined;
  const v = (userMetadata as Record<string, unknown>).name_changed_at;
  return typeof v === 'string' ? v : undefined;
}

export default function EditProfileScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { width: windowWidth } = useWindowDimensions();
  const { colors } = useAppTheme();
  const { profile, session, role, refreshProfile, refreshSession } = useAuth();

  const contentWidth = windowWidth - SCROLL_HORIZONTAL_PAD * 2;
  const avatarCellSize = Math.max(
    48,
    Math.floor((contentWidth - AVATAR_GRID_GAP * (AVATAR_GRID_COLS - 1)) / AVATAR_GRID_COLS)
  );
  const thumbInner = Math.max(32, avatarCellSize - 10);

  const [name, setName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName((profile.name ?? '').trim());
    setAvatarIndex(getAvatarIndexFromPhotoUrl(profile.photo_url));
    setCustomPhotoUrl(profile.photo_url?.trim() || null);
  }, [profile?.id, profile?.name, profile?.photo_url]);

  const email = session?.user?.email ?? '—';
  const phoneDisplay = profile?.phone?.trim() || '—';

  const nameChangedAtMeta = useMemo(
    () => getNameChangedAtFromSession(session?.user?.user_metadata),
    [session?.user?.user_metadata]
  );

  const nameAllowed = useMemo(() => canChangeName(nameChangedAtMeta), [nameChangedAtMeta]);
  const daysLeft = useMemo(() => daysUntilNameAllowed(nameChangedAtMeta), [nameChangedAtMeta]);
  const canUploadCustomPhoto = role === 'barber';
  const previewPhotoUrl = customPhotoUrl || photoUrlFromAvatarIndex(avatarIndex);

  const nameTrimmed = name.trim();
  const nameDirty = nameTrimmed !== (profile?.name ?? '').trim();

  const handlePickBarberPhoto = async () => {
    if (!session?.user?.id) return;

    try {
      setUploadingPhoto(true);
      const asset = await pickImageFromGallery();
      if (!asset?.uri) return;

      const extension = asset.mimeType?.includes('png')
        ? 'png'
        : asset.mimeType?.includes('webp')
          ? 'webp'
          : 'jpg';
      const path = `profiles/${session.user.id}.${extension}`;
      const uploadedUrl = await uploadImageFromUri({
        uri: asset.uri,
        bucket: BARBER_PHOTOS_BUCKET,
        path,
        contentType: asset.mimeType ?? 'image/jpeg',
      });

      setCustomPhotoUrl(`${uploadedUrl}?v=${Date.now()}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo subir la foto';
      Alert.alert('Foto', msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!session?.user?.id || !profile) {
      Alert.alert('Sesión', 'No hay sesión activa.');
      return;
    }

    if (nameDirty && !nameAllowed) {
      Alert.alert(
        'Nombre',
        `Solo puedes cambiar tu nombre una vez cada ${NAME_COOLDOWN_DAYS} días. Podrás hacerlo de nuevo en unos ${daysLeft} día(s).`
      );
      return;
    }

    if (nameTrimmed.length < 2) {
      Alert.alert('Nombre', 'Introduce al menos 2 caracteres para el nombre.');
      return;
    }

    const nextPhoto = canUploadCustomPhoto ? customPhotoUrl : photoUrlFromAvatarIndex(avatarIndex);
    const avatarDirty = nextPhoto !== (profile.photo_url ?? null);

    if (!nameDirty && !avatarDirty) {
      navigation.goBack();
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      if (avatarDirty) {
        payload.photo_url = nextPhoto;
      }
      if (nameDirty) {
        payload.name = nameTrimmed;
      }

      const { error } = await supabase.from('profiles').update(payload).eq('id', session.user.id);
      if (error) throw error;

      if (nameDirty) {
        const meta = {
          ...((session.user.user_metadata ?? {}) as Record<string, unknown>),
          name: nameTrimmed,
          name_changed_at: new Date().toISOString(),
        };
        const { error: authErr } = await supabase.auth.updateUser({ data: meta });
        if (authErr) throw authErr;
        await refreshSession();
      }

      await refreshProfile();
      navigation.goBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>Editar perfil</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.subtext }]}>Foto de perfil</Text>
        <View style={styles.previewRow}>
          <ProfileAvatar photoUrl={previewPhotoUrl} size={72} />
          <Text style={[styles.hint, { color: colors.subtext, flex: 1 }]}>
            {canUploadCustomPhoto
              ? 'Puedes subir tu foto desde la galeria o mantener una imagen predeterminada.'
              : 'Elige un avatar de El Patrón (imágenes incluidas en la app).'}
          </Text>
        </View>

        {canUploadCustomPhoto ? (
          <TouchableOpacity
            style={[
              styles.uploadBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              uploadingPhoto && { opacity: 0.75 },
            ]}
            onPress={handlePickBarberPhoto}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Feather name="image" size={18} color={colors.primary} />
            )}
            <Text style={[styles.uploadBtnText, { color: colors.text }]}>
              {customPhotoUrl ? 'Cambiar foto desde galeria' : 'Subir foto desde galeria'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {!canUploadCustomPhoto ? (
          <View style={[styles.avatarGrid, { gap: AVATAR_GRID_GAP }]}>
            {Array.from({ length: PROFILE_AVATAR_COUNT }, (_, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.avatarCell,
                  {
                    width: avatarCellSize,
                    height: avatarCellSize,
                    borderColor: avatarIndex === i ? colors.primary : colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
                onPress={() => {
                  setAvatarIndex(i);
                  setCustomPhotoUrl(null);
                }}
                activeOpacity={0.85}
              >
                <ProfileAvatar photoUrl={photoUrlFromAvatarIndex(i)} size={thumbInner} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.subtext, marginTop: 8 }]}>Nombre</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
            !nameAllowed && { opacity: 0.65 },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="Tu nombre"
          placeholderTextColor={colors.subtext}
          editable={nameAllowed}
        />
        {!nameAllowed ? (
          <Text style={[styles.cooldown, { color: colors.subtext }]}>
            Podrás cambiar el nombre de nuevo en {daysLeft} día(s).
          </Text>
        ) : (
          <Text style={[styles.cooldown, { color: colors.subtext }]}>
            Puedes cambiar el nombre como máximo una vez cada {NAME_COOLDOWN_DAYS} días.
          </Text>
        )}

        <Text style={[styles.sectionLabel, { color: colors.subtext, marginTop: 16 }]}>Correo electrónico</Text>
        <View style={[styles.readonly, { backgroundColor: colors.mutedBg, borderColor: colors.border }]}>
          <Text style={[styles.readonlyText, { color: colors.subtext }]}>{email}</Text>
          <Feather name="lock" size={16} color={colors.subtext} />
        </View>
        <Text style={[styles.micro, { color: colors.subtext }]}>
          El correo no se puede cambiar desde la app. Para cambios, contacta con soporte.
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.subtext, marginTop: 16 }]}>Teléfono</Text>
        <View style={[styles.readonly, { backgroundColor: colors.mutedBg, borderColor: colors.border }]}>
          <Text style={[styles.readonlyText, { color: colors.subtext }]}>{phoneDisplay}</Text>
          <Feather name="lock" size={16} color={colors.subtext} />
        </View>
        <Text style={[styles.micro, { color: colors.subtext }]}>
          El teléfono solo se muestra; no se puede modificar aquí.
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.75 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backBtn: { padding: 8 },
  topTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  hint: { fontSize: 13, lineHeight: 18 },
  uploadBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadBtnText: { fontWeight: '700', fontSize: 14 },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
    justifyContent: 'flex-start',
  },
  avatarCell: {
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  cooldown: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  readonly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyText: { fontSize: 15, flex: 1 },
  micro: { fontSize: 11, marginTop: 6, lineHeight: 17 },
  saveBtn: {
    marginTop: 28,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
