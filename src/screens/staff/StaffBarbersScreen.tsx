import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import { useAppTheme } from '../../theme/ThemeProvider';
import AppDialog from '../../components/AppDialog';
import { StaffScreenHeader } from '../../components/StaffScreenHeader';
import { DEFAULT_BARBER_AVATAR } from '../../api/fallbackData';
import { BARBER_PHOTOS_BUCKET, pickImageFromGallery, uploadImageFromUri } from '../../utils/storageUpload';

const DAYS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miercoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sabado' },
  { key: 'sun', label: 'Domingo' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];
type DaySchedule = { enabled: boolean; start: string; end: string };
type ScheduleState = Record<DayKey, DaySchedule>;

type BarberRow = {
  id: string;
  user_id: string;
  specialties: string[] | null;
  active: boolean;
  base_schedule: unknown | null;
  profile_name?: string | null;
  profile_photo_url?: string | null;
};

type ServiceRow = { id: string; name: string; active: boolean };

const DEFAULT_SCHEDULE: ScheduleState = {
  mon: { enabled: true, start: '10:00', end: '20:30' },
  tue: { enabled: true, start: '10:00', end: '20:30' },
  wed: { enabled: true, start: '10:00', end: '20:30' },
  thu: { enabled: true, start: '10:00', end: '20:30' },
  fri: { enabled: true, start: '10:00', end: '20:30' },
  sat: { enabled: true, start: '10:00', end: '14:00' },
  sun: { enabled: false, start: '10:00', end: '14:00' },
};

function buildSchedulePayload(schedule: ScheduleState): Record<string, { start: string; end: string } | null> {
  return DAYS.reduce((acc, day) => {
    const current = schedule[day.key];
    acc[day.key] = current.enabled ? { start: current.start.trim(), end: current.end.trim() } : null;
    return acc;
  }, {} as Record<string, { start: string; end: string } | null>);
}

async function extractFunctionError(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') return 'No se pudo completar la accion.';

  const maybeContext = (error as { context?: Response }).context;
  if (maybeContext && typeof maybeContext.json === 'function') {
    try {
      const payload = await maybeContext.json();
      if (payload?.error) return String(payload.error);
    } catch {
      // Ignora y usa el mensaje generico.
    }
  }

  return (error as { message?: string }).message || 'No se pudo completar la accion.';
}

export default function StaffBarbersScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [rows, setRows] = useState<BarberRow[]>([]);
  const [createMode, setCreateMode] = useState<'new_user' | 'existing_user'>('new_user');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [schedule, setSchedule] = useState<ScheduleState>(DEFAULT_SCHEDULE);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const resetForm = () => {
    setUserId('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setName('');
    setPhotoUrl('');
    setSchedule(DEFAULT_SCHEDULE);
    setSelectedServices([]);
  };

  const load = useCallback(async () => {
    const [{ data: barbersData, error: barbersError }, { data: servicesData, error: servicesError }] = await Promise.all([
      supabase.from('barbers').select('id, user_id, specialties, active, base_schedule').order('created_at', { ascending: false }),
      supabase.from('services').select('id, name, active').eq('active', true).order('name', { ascending: true }),
    ]);

    if (barbersError) {
      setDialog({ title: 'Error', message: barbersError.message });
      return;
    }
    if (servicesError) {
      setDialog({ title: 'Error', message: servicesError.message });
      return;
    }

    const barberRows = (barbersData as BarberRow[]) ?? [];
    const userIds = barberRows.map((row) => row.user_id).filter(Boolean);
    const { data: profilesData } = userIds.length
      ? await supabase.from('profiles').select('id, name, photo_url').in('id', userIds)
      : { data: [] };

    const profileMap: Record<string, { name: string | null; photo_url: string | null }> = {};
    ((profilesData ?? []) as { id: string; name: string | null; photo_url: string | null }[]).forEach((profile) => {
      profileMap[profile.id] = {
        name: profile.name,
        photo_url: profile.photo_url,
      };
    });

    setRows(
      barberRows.map((row) => ({
        ...row,
        profile_name: profileMap[row.user_id]?.name ?? null,
        profile_photo_url: profileMap[row.user_id]?.photo_url ?? null,
      }))
    );
    setServices((servicesData as ServiceRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleService = (serviceName: string) => {
    setSelectedServices((prev) => (prev.includes(serviceName) ? prev.filter((item) => item !== serviceName) : [...prev, serviceName]));
  };

  const updateDay = (key: DayKey, patch: Partial<DaySchedule>) => {
    setSchedule((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const pickBarberPhoto = async () => {
    setUploadingPhoto(true);
    try {
      const asset = await pickImageFromGallery();
      if (!asset?.uri) return;
      const extension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `temp/barber-${Date.now()}.${extension}`;
      const publicUrl = await uploadImageFromUri({
        uri: asset.uri,
        bucket: BARBER_PHOTOS_BUCKET,
        path,
        contentType: asset.mimeType ?? null,
      });
      setPhotoUrl(publicUrl);
    } catch (error) {
      setDialog({
        title: 'No se pudo subir la foto',
        message: error instanceof Error ? error.message : 'Error al subir la imagen.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const createBarber = async () => {
    if (!isAdmin) {
      setDialog({ title: 'Sin permisos', message: 'Solo el administrador puede guardar barberos.' });
      return;
    }
    if (!selectedServices.length) {
      setDialog({ title: 'Faltan servicios', message: 'Selecciona al menos un servicio para este barbero.' });
      return;
    }

    const cleanUserId = userId.trim();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhotoUrl = photoUrl.trim();
    const baseSchedule = buildSchedulePayload(schedule);

    if (createMode === 'new_user') {
      if (!cleanEmail) {
        setDialog({ title: 'Correo requerido', message: 'Ingresa el correo del nuevo barbero.' });
        return;
      }
      if (!password || password.length < 8) {
        setDialog({ title: 'Contrasena invalida', message: 'La contrasena debe tener al menos 8 caracteres.' });
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setDialog({ title: 'Contrasena invalida', message: 'La contrasena debe incluir al menos una letra mayuscula.' });
        return;
      }
      if (password !== confirmPassword) {
        setDialog({ title: 'Contrasenas distintas', message: 'La confirmacion no coincide con la contrasena.' });
        return;
      }
    }

    if (createMode === 'existing_user' && !cleanUserId) {
      setDialog({ title: 'Falta el usuario', message: 'Ingresa el UUID del usuario que ya existe en Auth.' });
      return;
    }

    setSaving(true);
    let finalUserId = cleanUserId;

    try {
      if (createMode === 'new_user') {
        const { data, error } = await supabase.functions.invoke('create-barber-user', {
          body: {
            email: cleanEmail,
            password,
            name: cleanName || null,
            specialties: selectedServices,
            photo_url: cleanPhotoUrl || null,
            base_schedule: baseSchedule,
          },
        });

        if (error) {
          setDialog({ title: 'No se pudo crear', message: await extractFunctionError(error) });
          return;
        }
        if (data?.error) {
          setDialog({ title: 'No se pudo crear', message: String(data.error) });
          return;
        }
        if (!data?.user_id) {
          setDialog({ title: 'Respuesta invalida', message: 'La funcion no devolvio el usuario creado.' });
          return;
        }
        finalUserId = String(data.user_id);
      }

      if (createMode === 'existing_user') {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: finalUserId,
          role: 'barber',
          name: cleanName || null,
          photo_url: cleanPhotoUrl || null,
        });
        if (profileError) {
          setDialog({
            title: 'No se pudo guardar el perfil',
            message: `Verifica que el user_id exista en Auth. Detalle: ${profileError.message}`,
          });
          return;
        }

        const { data: existing, error: existingError } = await supabase.from('barbers').select('id').eq('user_id', finalUserId).maybeSingle();
        if (existingError) {
          setDialog({ title: 'Error', message: existingError.message });
          return;
        }

        const payload = { user_id: finalUserId, specialties: selectedServices, active: true, base_schedule: baseSchedule };
        if (existing?.id) {
          const { error } = await supabase.from('barbers').update(payload).eq('id', existing.id);
          if (error) {
            setDialog({ title: 'No se pudo actualizar', message: error.message });
            return;
          }
        } else {
          const { error } = await supabase.from('barbers').insert(payload);
          if (error) {
            setDialog({ title: 'No se pudo crear', message: error.message });
            return;
          }
        }
      }

      resetForm();
      setDialog({ title: 'Listo', message: 'El barbero se guardo correctamente.' });
      void load();
    } catch (error) {
      setDialog({
        title: 'No se pudo guardar',
        message: error instanceof Error ? error.message : 'Ocurrio un error al guardar el barbero.',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: BarberRow, next: boolean) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('barbers').update({ active: next }).eq('id', row.id);
    if (error) {
      setDialog({ title: 'Error', message: error.message });
      return;
    }
    void load();
  };

  const renderHeader = () => (
    <>
      <StaffScreenHeader title="Barberos" navigation={navigation} />
      {isAdmin ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Nuevo barbero</Text>
          <Text style={styles.formHelper}>Completa los datos de acceso, la foto y el horario del barbero.</Text>

          <View style={styles.chipsWrap}>
            <TouchableOpacity style={[styles.chip, createMode === 'new_user' && styles.chipActive]} onPress={() => setCreateMode('new_user')}>
              <Text style={[styles.chipTxt, createMode === 'new_user' && styles.chipTxtActive]}>Nuevo usuario</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, createMode === 'existing_user' && styles.chipActive]} onPress={() => setCreateMode('existing_user')}>
              <Text style={[styles.chipTxt, createMode === 'existing_user' && styles.chipTxtActive]}>Usuario existente</Text>
            </TouchableOpacity>
          </View>

          {createMode === 'new_user' ? (
            <>
              <Text style={styles.label}>Correo del barbero</Text>
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={colors.subtext}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Contrasena</Text>
              <View style={styles.inputWithAction}>
                <TextInput
                  style={styles.inputInline}
                  placeholder="Minimo 8 caracteres y una mayuscula"
                  placeholderTextColor={colors.subtext}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Repetir contrasena</Text>
              <View style={styles.inputWithAction}>
                <TextInput
                  style={styles.inputInline}
                  placeholder="Repite la contrasena"
                  placeholderTextColor={colors.subtext}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Feather name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color={colors.subtext} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>UUID del usuario existente</Text>
              <TextInput
                style={styles.input}
                placeholder="Pega aqui el user_id de Auth"
                placeholderTextColor={colors.subtext}
                value={userId}
                onChangeText={setUserId}
              />
            </>
          )}

          <Text style={styles.label}>Nombre visible</Text>
          <TextInput style={styles.input} placeholder="Nombre del barbero" placeholderTextColor={colors.subtext} value={name} onChangeText={setName} />

          <Text style={styles.label}>Foto del barbero</Text>
          <View style={styles.photoPickerCard}>
            <Image source={photoUrl ? { uri: photoUrl } : DEFAULT_BARBER_AVATAR} style={styles.previewPhoto} />
            <View style={{ flex: 1 }}>
              <Text style={styles.photoPickerText}>Sube una foto desde la galeria. Se mostrara en inicio, listado y perfil del barbero.</Text>
              <Text style={styles.photoPickerText}>Si no subes una foto, se usara la imagen por defecto.</Text>
              <TouchableOpacity style={styles.photoBtn} onPress={() => void pickBarberPhoto()} disabled={uploadingPhoto}>
                {uploadingPhoto ? <ActivityIndicator color="#fff" /> : <Text style={styles.photoBtnTxt}>Elegir foto</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Servicios que ofrece</Text>
          <View style={styles.chipsWrap}>
            {services.map((service) => {
              const selected = selectedServices.includes(service.name);
              return (
                <TouchableOpacity key={service.id} style={[styles.chip, selected && styles.chipActive]} onPress={() => toggleService(service.name)}>
                  <Text style={[styles.chipTxt, selected && styles.chipTxtActive]}>{service.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Horario de atencion</Text>
          {DAYS.map((day) => {
            const dayState = schedule[day.key];
            return (
              <View key={day.key} style={styles.scheduleCard}>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleDay}>{day.label}</Text>
                  <Switch value={dayState.enabled} onValueChange={(value) => updateDay(day.key, { enabled: value })} trackColor={{ false: colors.border, true: colors.primary }} />
                </View>
                {dayState.enabled ? (
                  <View style={styles.scheduleInputs}>
                    <View style={styles.scheduleInputWrap}>
                      <Text style={styles.scheduleLabel}>Desde</Text>
                      <TextInput style={styles.input} placeholder="10:00" placeholderTextColor={colors.subtext} value={dayState.start} onChangeText={(value) => updateDay(day.key, { start: value })} />
                    </View>
                    <View style={styles.scheduleInputWrap}>
                      <Text style={styles.scheduleLabel}>Hasta</Text>
                      <TextInput style={styles.input} placeholder="20:30" placeholderTextColor={colors.subtext} value={dayState.end} onChangeText={(value) => updateDay(day.key, { end: value })} />
                    </View>
                  </View>
                ) : (
                  <Text style={styles.closedText}>Dia libre</Text>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={[styles.btn, (saving || uploadingPhoto) && styles.btnDisabled]} onPress={createBarber} disabled={saving || uploadingPhoto}>
            <Text style={styles.btnTxt}>{saving ? 'Guardando...' : 'Guardar barbero'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.note}>Como barbero, aqui solo puedes revisar la lista.</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {rows.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Image source={item.profile_photo_url ? { uri: item.profile_photo_url } : DEFAULT_BARBER_AVATAR} style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.profile_name?.trim() || 'Barbero'}</Text>
                <Text style={styles.meta}>Servicios: {(item.specialties ?? []).join(', ') || '-'}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <Text style={styles.meta}>{item.active ? 'Visible en la app' : 'Oculto en la app'}</Text>
              <Switch value={item.active} disabled={!isAdmin} onValueChange={(value) => toggleActive(item, value)} trackColor={{ false: colors.border, true: colors.primary }} />
            </View>
          </View>
        ))}
      </ScrollView>

      <AppDialog visible={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''} onClose={() => setDialog(null)} />
    </SafeAreaView>
  );
}

function createStyles(colors: { primary: string; background: string; card: string; text: string; subtext: string; border: string; mutedBg: string }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    note: { color: colors.subtext, marginBottom: 10 },
    form: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, backgroundColor: colors.card, marginBottom: 12 },
    formTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
    formHelper: { color: colors.subtext, marginBottom: 12, lineHeight: 18 },
    label: { color: colors.text, fontWeight: '700', marginBottom: 6 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, color: colors.text, marginBottom: 10, backgroundColor: colors.background },
    inputWithAction: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      minHeight: 46,
      marginBottom: 10,
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputInline: { flex: 1, color: colors.text, minHeight: 46 },
    sectionTitle: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 2, marginBottom: 8 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
    chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    chipTxt: { color: colors.text, fontWeight: '700', fontSize: 12 },
    chipTxtActive: { color: '#fff' },
    photoPickerCard: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10, backgroundColor: colors.background, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10 },
    previewPhoto: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.mutedBg },
    photoPickerText: { color: colors.subtext, lineHeight: 18, marginBottom: 8 },
    photoBtn: { height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, alignSelf: 'flex-start' },
    photoBtnTxt: { color: '#fff', fontWeight: '700' },
    scheduleCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, backgroundColor: colors.background, marginBottom: 10 },
    scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    scheduleDay: { color: colors.text, fontWeight: '800', fontSize: 15 },
    scheduleInputs: { flexDirection: 'row', gap: 10 },
    scheduleInputWrap: { flex: 1 },
    scheduleLabel: { color: colors.subtext, fontSize: 12, fontWeight: '700', marginBottom: 4 },
    closedText: { color: colors.subtext, fontWeight: '600' },
    btn: { height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
    btnDisabled: { opacity: 0.6 },
    btnTxt: { color: '#fff', fontWeight: '800' },
    card: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, marginBottom: 10, backgroundColor: colors.card },
    cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    thumb: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.mutedBg },
    name: { color: colors.text, fontWeight: '800', fontSize: 16 },
    meta: { color: colors.subtext, marginTop: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  });
}
